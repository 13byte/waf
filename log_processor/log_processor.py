import time
import os
import json
import re
from datetime import datetime
import logging

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, JSON
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import IntegrityError, OperationalError

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from attack_detection import AttackDetectionEngine

# --- Logging Setup ---
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Environment Variables ---
DB_HOST = os.getenv("DB_HOST", "database")
DB_PORT = os.getenv("DB_PORT", 3306)
DB_NAME = os.getenv("DB_NAME", "waf_test_db")
DB_USER = os.getenv("DB_USER", "waf_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "waf_pass123")
LOG_FILE_PATH = "/var/log/modsecurity/audit.log"
STATE_FILE_PATH = "/app/data/log_processor.state"

# --- Database Setup ---
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
Base = declarative_base()

class WafLog(Base):
    __tablename__ = "waf_logs"
    
    # Primary Key
    id = Column(Integer, primary_key=True)
    log_unique_id = Column(String(255), unique=True, nullable=False)
    
    # Timestamp
    timestamp = Column(DateTime, nullable=False)
    
    # Network Information (aligned with DB schema)
    source_ip = Column(String(50), nullable=False)
    source_port = Column(Integer)
    dest_ip = Column(String(50))
    dest_port = Column(Integer)
    target_website = Column(String(255))
    
    # Request Information
    method = Column(String(10), nullable=False)
    uri = Column(String(2048), nullable=False)
    status_code = Column(Integer, nullable=False)
    
    # Attack Detection (aligned with DB schema)
    is_blocked = Column(Boolean, nullable=False)
    is_attack = Column(Boolean, default=False)
    attack_types = Column(JSON)
    rule_ids = Column(JSON)
    rule_files = Column(JSON)
    severity_score = Column(Integer, default=0)
    anomaly_score = Column(Integer, default=0)
    
    # Raw Data
    raw_log = Column(JSON)

engine = None
SessionLocal = None

def get_db_session():
    global engine, SessionLocal
    while SessionLocal is None:
        try:
            if engine is None:
                engine = create_engine(DATABASE_URL)
            Base.metadata.create_all(bind=engine)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            logging.info("Database connection successful.")
        except OperationalError as e:
            logging.error(f"Database connection failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)
    return SessionLocal()

# --- Log Processing ---
def parse_log_entry(log_json: dict):
    """
    Parse ModSecurity log entry using attack detection engine
    
    Args:
        log_json: Raw ModSecurity log entry
        
    Returns:
        WafLog instance or None if parsing fails
    """
    try:
        # Debug: Check what we're receiving
        transaction = log_json.get('transaction', {})
        logging.debug(f"parse_log_entry received: messages={len(transaction.get('messages', []))}, transaction={bool(transaction)}")
        
        # Use attack detection engine
        parsed_data = AttackDetectionEngine.analyze_log_entry(log_json)
        
        if not parsed_data:
            logging.warning(f"Failed to parse log entry: {log_json.get('transaction', {}).get('unique_id', 'unknown')}")
            return None
        
        # Create WafLog instance with parsed data (aligned to DB schema)
        return WafLog(
            log_unique_id=parsed_data['log_unique_id'],
            timestamp=parsed_data['timestamp'],
            
            # Network information
            source_ip=parsed_data.get('source_ip', parsed_data.get('client_ip', 'unknown')),
            source_port=parsed_data.get('source_port'),
            dest_ip=parsed_data.get('dest_ip'),
            dest_port=parsed_data.get('dest_port'),
            target_website=parsed_data.get('target_website'),
            
            # Request information
            method=parsed_data['method'],
            uri=parsed_data['uri'],
            status_code=parsed_data['status_code'],
            
            # Attack detection
            is_blocked=parsed_data['is_blocked'],
            is_attack=parsed_data.get('is_attack', False),
            attack_types=parsed_data['attack_types'],
            rule_ids=parsed_data['rule_ids'],
            rule_files=parsed_data.get('rule_files'),
            severity_score=parsed_data['severity_score'],
            anomaly_score=parsed_data.get('anomaly_score', 0),
            
            # Raw data
            raw_log=log_json
        )
        
    except Exception as e:
        logging.error(f"Error parsing log entry: {e}")
        return None

def process_new_logs(db, last_position):
    if not os.path.exists(LOG_FILE_PATH):
        return last_position

    with open(LOG_FILE_PATH, 'r') as f:
        f.seek(last_position)
        logging.debug(f"Seeking to position: {last_position}")
        
        # If we're not at the beginning of the file,
        # we might be in the middle of a line, so skip to the next complete line
        if last_position > 0:
            # Read and discard the potentially partial first line
            partial = f.readline()
            logging.debug(f"Skipped potentially partial line after seek")
        
        for line in f:
            try:
                logging.debug(f"Raw line before JSON load: {repr(line)}")
                # Fix ModSecurity JSON bug: "OWASP_CRS/4.17.1\"" should be "OWASP_CRS/4.17.1"
                # This is a known ModSecurity v3 bug where the components field is not properly escaped
                # Fix the specific pattern we see in the logs: "OWASP_CRS/4.17.1\""]
                line = line.replace('OWASP_CRS/4.17.1\\""', 'OWASP_CRS/4.17.1"')
                
                try:
                    log_data = json.loads(line)
                except json.JSONDecodeError as e:
                    # If still failing, try more aggressive fixing
                    logging.debug(f"First JSON parse failed: {e}")
                    logging.debug(f"Problem area in line: {line[max(0, e.pos-50):min(len(line), e.pos+50)]}")
                    # Remove the entire problematic components field
                    line = re.sub(r'"components":\[[^\]]*\]', '"components":["OWASP_CRS/4.17.1"]', line)
                    log_data = json.loads(line)
                transaction = log_data.get('transaction', {})
                logging.debug(f"After JSON parse: messages={len(transaction.get('messages', []))}, keys={list(log_data.keys())}")
                parsed_log = parse_log_entry(log_data)
                if parsed_log:
                    db.add(parsed_log)
                    db.commit()
            except json.JSONDecodeError:
                logging.warning(f"Skipping invalid JSON line: {line.strip()}")
            except IntegrityError:
                db.rollback()
                logging.warning(f"Duplicate log entry skipped: {parsed_log.log_unique_id}")
            except Exception as e:
                db.rollback()
                logging.error(f"Error processing log line: {e}")
        
        new_position = f.tell()
    
    with open(STATE_FILE_PATH, 'w') as f:
        f.write(str(new_position))
        
    return new_position

class LogFileHandler(FileSystemEventHandler):
    def __init__(self, db_session_factory):
        self.db_session_factory = db_session_factory
        self.last_position = self.load_state()

    def load_state(self):
        os.makedirs(os.path.dirname(STATE_FILE_PATH), exist_ok=True)
        if os.path.exists(STATE_FILE_PATH):
            with open(STATE_FILE_PATH, 'r') as f:
                return int(f.read().strip())
        return 0

    def on_modified(self, event):
        if event.src_path == LOG_FILE_PATH:
            logging.info("Log file modified. Processing new entries.")
            db = self.db_session_factory()
            try:
                self.last_position = process_new_logs(db, self.last_position)
            finally:
                db.close()

def main():
    logging.info("Starting log processor service.")
    db_session_factory = get_db_session
    
    # Initial check in case logs were written before service start
    db = db_session_factory()
    try:
        handler = LogFileHandler(db_session_factory)
        handler.last_position = process_new_logs(db, handler.load_state())
    finally:
        db.close()

    observer = Observer()
    observer.schedule(handler, path=os.path.dirname(LOG_FILE_PATH), recursive=False)
    observer.start()
    logging.info(f"Watching for changes in {LOG_FILE_PATH}")

    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()
