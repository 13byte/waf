import time
import os
import json
from datetime import datetime
import logging

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, JSON
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import IntegrityError, OperationalError

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

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
    id = Column(Integer, primary_key=True)
    log_unique_id = Column(String(255), unique=True, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    client_ip = Column(String(50), nullable=False)
    method = Column(String(10), nullable=False)
    uri = Column(String(2048), nullable=False)
    status_code = Column(Integer, nullable=False)
    is_blocked = Column(Boolean, nullable=False)
    attack_types = Column(JSON)
    rule_ids = Column(JSON)
    severity_score = Column(Integer, default=0)
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
    try:
        transaction = log_json.get("transaction", {})
        request = transaction.get("request", {})
        response = transaction.get("response", {})
        
        # Ensure log_json is a standard dictionary
        log_json_dict = dict(log_json)
        
        logging.debug(f"Type of log_json_dict: {type(log_json_dict)}")
        logging.debug(f"Keys in log_json_dict: {log_json_dict.keys()}")
        for key, value in log_json_dict.items():
            logging.debug(f"  Key: {repr(key)}, Value type: {type(value)}")
        logging.debug(f"Full log_json (as dict): {log_json_dict}")
        
        messages = log_json_dict.get("messages", [])
        logging.debug(f"Raw messages extracted (using .get()): {messages}")
        
        # Try direct access to see if it's different
        try:
            direct_messages = log_json_dict['messages']
            logging.debug(f"Raw messages extracted (direct access): {direct_messages}")
        except KeyError:
            direct_messages = []
            logging.debug("Messages key not found via direct access.")

        status_code = response.get("http_code", 0)
        is_blocked = status_code == 403 and len(messages) > 0
        
        logging.debug(f"Processing log: unique_id={transaction.get('unique_id')}, status_code={status_code}, messages_len={len(messages)}, is_blocked={is_blocked}")
        
        attack_types, rule_ids, severity_score = [], [], 0
        for msg in messages:
            details = msg.get("details", {})
            tags = details.get("tags", [])
            for tag in tags:
                if tag.startswith("attack-"):
                    attack_type = tag.split('-', 1)[1].upper()
                    if attack_type not in attack_types:
                        attack_types.append(attack_type)
            
            rule_id = details.get("ruleId")
            if rule_id and rule_id not in rule_ids:
                rule_ids.append(rule_id)
            
            severity = details.get("severity", "0")
            severity_score += int(severity) if severity.isdigit() else 0

        return WafLog(
            log_unique_id=transaction.get("unique_id"),
            timestamp=datetime.strptime(transaction.get("time_stamp"), "%a %b %d %H:%M:%S %Y"),
            client_ip=transaction.get("client_ip"),
            method=request.get("method"),
            uri=request.get("uri"),
            status_code=status_code,
            is_blocked=is_blocked,
            attack_types=attack_types,
            rule_ids=rule_ids,
            severity_score=severity_score,
            raw_log=log_json
        )
    except (KeyError, TypeError, ValueError) as e:
        logging.warning(f"Could not parse log entry: {e} - Entry: {log_json}")
        return None

def process_new_logs(db, last_position):
    if not os.path.exists(LOG_FILE_PATH):
        return last_position

    with open(LOG_FILE_PATH, 'r') as f:
        f.seek(last_position)
        for line in f:
            try:
                logging.debug(f"Raw line before JSON load: {repr(line)}")
                log_data = json.loads(line)
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
