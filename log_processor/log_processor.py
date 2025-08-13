# Log processor service - parses ModSecurity logs and creates security events
import time
import os
import json
import re
import uuid
import hashlib
from datetime import datetime
import logging
import requests
from typing import Optional, Dict, Any

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, JSON, Float, Text, Index
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

# Security event model for new architecture
class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    # Primary Key
    id = Column(Integer, primary_key=True)
    event_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Timestamp
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # Network Information
    source_ip = Column(String(50), nullable=False, index=True)
    source_port = Column(Integer)
    destination_ip = Column(String(50))
    destination_port = Column(Integer)
    
    # Request Details
    target_website = Column(String(255))
    uri = Column(Text, nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False)
    user_agent = Column(Text)
    
    # Attack Classification
    attack_type = Column(String(50), index=True)  # XSS, SQLI, LFI, etc.
    severity = Column(String(20), index=True)  # low, medium, high, critical
    is_attack = Column(Boolean, default=False, index=True)
    is_blocked = Column(Boolean, nullable=False, index=True)
    
    # Risk Assessment
    risk_score = Column(Float, default=0.0)
    anomaly_score = Column(Integer, default=0)
    
    # WAF Details
    rules_matched = Column(JSON)  # List of matched rule IDs
    rule_files = Column(JSON)
    
    # Headers and Body
    request_headers = Column(JSON)
    request_body = Column(Text)
    response_headers = Column(JSON)
    response_body = Column(Text)
    
    # Geo Location (to be filled by enrichment)
    geo_location = Column(JSON)
    
    # Indexes for better performance
    __table_args__ = (
        Index('idx_timestamp_attack', 'timestamp', 'is_attack'),
        Index('idx_source_ip_timestamp', 'source_ip', 'timestamp'),
        Index('idx_attack_type_severity', 'attack_type', 'severity'),
    )

# Keep old table for backward compatibility
class WafLog(Base):
    __tablename__ = "waf_logs"
    id = Column(Integer, primary_key=True)
    log_unique_id = Column(String(255), unique=True, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    source_ip = Column(String(50), nullable=False)
    source_port = Column(Integer)
    dest_ip = Column(String(50))
    dest_port = Column(Integer)
    target_website = Column(String(255))
    method = Column(String(10), nullable=False)
    uri = Column(String(2048), nullable=False)
    status_code = Column(Integer, nullable=False)
    is_blocked = Column(Boolean, nullable=False)
    is_attack = Column(Boolean, default=False)
    attack_types = Column(JSON)
    rule_ids = Column(JSON)
    rule_files = Column(JSON)
    severity_score = Column(Integer, default=0)
    anomaly_score = Column(Integer, default=0)
    raw_log = Column(JSON)

engine = None
SessionLocal = None

def get_db_session():
    global engine, SessionLocal
    max_retries = 10
    retry_count = 0
    retry_delay = 5
    
    while SessionLocal is None and retry_count < max_retries:
        try:
            if engine is None:
                engine = create_engine(DATABASE_URL)
            Base.metadata.create_all(bind=engine)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            logging.info("Database connection successful.")
        except OperationalError as e:
            retry_count += 1
            if retry_count >= max_retries:
                logging.error(f"Database connection failed after {max_retries} attempts: {e}")
                raise
            logging.error(f"Database connection failed (attempt {retry_count}/{max_retries}): {e}. Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)
            # Exponential backoff with max delay of 30 seconds
            retry_delay = min(retry_delay * 1.5, 30)
    
    if SessionLocal is None:
        raise Exception("Failed to establish database connection")
    
    return SessionLocal()

# --- Log Processing ---
def determine_severity(anomaly_score: int, is_blocked: bool, attack_types: list) -> str:
    """Determine severity level based on scores and attack types"""
    if anomaly_score >= 100 or (is_blocked and len(attack_types) > 2):
        return "critical"
    elif anomaly_score >= 50 or (is_blocked and attack_types):
        return "high"
    elif anomaly_score >= 20 or attack_types:
        return "medium"
    else:
        return "low"

def calculate_risk_score(parsed_data: dict) -> float:
    """Calculate risk score for event"""
    score = 0.0
    
    # Base score from anomaly
    score += min(parsed_data.get('anomaly_score', 0) * 2, 50)
    
    # Add for attack types
    attack_types = parsed_data.get('attack_types', [])
    score += len(attack_types) * 15
    
    # Add for severity
    severity_score = parsed_data.get('severity_score', 0)
    score += severity_score * 5
    
    # Reduce if blocked
    if parsed_data.get('is_blocked'):
        score *= 0.7
    
    return min(100.0, score)

def parse_log_entry(log_json: dict) -> Optional[Dict[str, Any]]:
    """Parse ModSecurity log and create both legacy and new event"""
    try:
        transaction = log_json.get('transaction', {})
        logging.debug(f"Processing transaction: {transaction.get('unique_id', 'unknown')}")
        
        # Use attack detection engine
        parsed_data = AttackDetectionEngine.analyze_log_entry(log_json)
        
        if not parsed_data:
            logging.warning(f"Failed to parse log entry")
            return None
        
        # Map attack types to new format
        attack_type = None
        if parsed_data.get('attack_types'):
            # Map to single primary attack type
            types_map = {
                'XSS': 'XSS',
                'SQL Injection': 'SQLI',
                'Path Traversal': 'LFI',
                'Command Injection': 'RCE',
                'XXE': 'XXE',
                'SSRF': 'SSRF'
            }
            for old_type in parsed_data['attack_types']:
                if old_type in types_map:
                    attack_type = types_map[old_type]
                    break
            if not attack_type and parsed_data['attack_types']:
                attack_type = parsed_data['attack_types'][0]
        
        # Extract headers
        request_headers = {}
        response_headers = {}
        if 'request' in transaction:
            request_headers = transaction['request'].get('headers', {})
        if 'response' in transaction:
            response_headers = transaction['response'].get('headers', {})
        
        # Generate event ID
        event_id = str(uuid.uuid4())
        
        # Determine severity
        severity = determine_severity(
            parsed_data.get('anomaly_score', 0),
            parsed_data.get('is_blocked', False),
            parsed_data.get('attack_types', [])
        )
        
        # Calculate risk score
        risk_score = calculate_risk_score(parsed_data)
        
        # Create result with both models
        result = {
            # Legacy WafLog fields
            'waf_log': WafLog(
                log_unique_id=parsed_data['log_unique_id'],
                timestamp=parsed_data['timestamp'],
                source_ip=parsed_data.get('source_ip', 'unknown'),
                source_port=parsed_data.get('source_port'),
                dest_ip=parsed_data.get('dest_ip'),
                dest_port=parsed_data.get('dest_port'),
                target_website=parsed_data.get('target_website'),
                method=parsed_data['method'],
                uri=parsed_data['uri'],
                status_code=parsed_data['status_code'],
                is_blocked=parsed_data['is_blocked'],
                is_attack=parsed_data.get('is_attack', False),
                attack_types=parsed_data['attack_types'],
                rule_ids=parsed_data['rule_ids'],
                rule_files=parsed_data.get('rule_files'),
                severity_score=parsed_data['severity_score'],
                anomaly_score=parsed_data.get('anomaly_score', 0),
                raw_log=log_json
            ),
            # New SecurityEvent
            'security_event': SecurityEvent(
                event_id=event_id,
                timestamp=parsed_data['timestamp'],
                source_ip=parsed_data.get('source_ip', 'unknown'),
                source_port=parsed_data.get('source_port'),
                destination_ip=parsed_data.get('dest_ip'),
                destination_port=parsed_data.get('dest_port'),
                target_website=parsed_data.get('target_website'),
                uri=parsed_data['uri'],
                method=parsed_data['method'],
                status_code=parsed_data['status_code'],
                user_agent=request_headers.get('User-Agent', ''),
                attack_type=attack_type,
                severity=severity,
                is_attack=parsed_data.get('is_attack', False),
                is_blocked=parsed_data['is_blocked'],
                risk_score=risk_score,
                anomaly_score=parsed_data.get('anomaly_score', 0),
                rules_matched=parsed_data['rule_ids'],
                rule_files=parsed_data.get('rule_files'),
                request_headers=request_headers,
                request_body=transaction.get('request', {}).get('body', ''),
                response_headers=response_headers,
                response_body=transaction.get('response', {}).get('body', ''),
                geo_location=None  # Will be enriched later
            )
        }
        
        return result
        
    except Exception as e:
        logging.error(f"Error parsing log entry: {e}")
        return None

def notify_backend_new_event(event_data: dict):
    """Notify backend API about new security event for WebSocket broadcast"""
    try:
        # Try to notify backend for real-time updates
        backend_url = "http://backend:8000/api/security-events/broadcast"
        requests.post(backend_url, json=event_data, timeout=1)
    except Exception as e:
        # Don't block if backend is not available
        logging.debug(f"Could not notify backend: {e}")

def process_new_logs(db, last_position):
    """Process new log entries and create security events"""
    if not os.path.exists(LOG_FILE_PATH):
        return last_position

    events_created = 0
    with open(LOG_FILE_PATH, 'r') as f:
        f.seek(last_position)
        logging.debug(f"Seeking to position: {last_position}")
        
        # Skip partial line if not at beginning
        if last_position > 0:
            f.readline()
            logging.debug(f"Skipped partial line after seek")
        
        for line in f:
            try:
                # Fix known ModSecurity JSON issues
                line = line.replace('OWASP_CRS/4.17.1\\""', 'OWASP_CRS/4.17.1"')
                
                try:
                    log_data = json.loads(line)
                except json.JSONDecodeError as e:
                    # Try aggressive fix
                    logging.debug(f"JSON parse failed, attempting fix")
                    line = re.sub(r'"components":\[[^\]]*\]', '"components":["OWASP_CRS/4.17.1"]', line)
                    log_data = json.loads(line)
                
                # Parse and create events
                result = parse_log_entry(log_data)
                if result:
                    # Add legacy log for compatibility
                    try:
                        db.add(result['waf_log'])
                        db.commit()
                    except IntegrityError:
                        db.rollback()
                        logging.debug(f"Duplicate legacy log skipped")
                    
                    # Add new security event
                    try:
                        db.add(result['security_event'])
                        db.commit()
                        events_created += 1
                        
                        # Notify backend for real-time updates
                        event = result['security_event']
                        notify_backend_new_event({
                            "id": event.event_id,
                            "timestamp": event.timestamp.isoformat(),
                            "source_ip": event.source_ip,
                            "attack_type": event.attack_type,
                            "severity": event.severity,
                            "is_blocked": event.is_blocked
                        })
                        
                    except IntegrityError:
                        db.rollback()
                        logging.debug(f"Duplicate security event skipped")
                    
            except json.JSONDecodeError:
                logging.warning(f"Invalid JSON line skipped")
            except Exception as e:
                db.rollback()
                logging.error(f"Error processing log: {e}")
        
        new_position = f.tell()
    
    if events_created > 0:
        logging.info(f"Created {events_created} new security events")
    
    # Save position
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
