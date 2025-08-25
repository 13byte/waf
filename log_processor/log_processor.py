# Optimized log processor for fast initial bulk loading
import time
import os
import json
import re
import uuid
import hashlib
from datetime import datetime
import logging
from typing import List, Dict, Any
from collections import defaultdict

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError, OperationalError

from attack_detection import AttackDetectionEngine

# Logging Setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Environment Variables
DB_HOST = os.getenv("DB_HOST", "database")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "waf_test_db")
DB_USER = os.getenv("DB_USER", "waf_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
LOG_FILE_PATH = os.getenv("LOG_FILE_PATH", "/var/log/modsecurity/audit.log")
STATE_FILE_PATH = os.getenv("STATE_FILE_PATH", "/app/data/log_processor.state")

# Optimized batch size for initial load
INITIAL_LOAD_BATCH_SIZE = 5000  # Much larger batch for initial load
NORMAL_BATCH_SIZE = 100
BULK_INSERT_THRESHOLD = 1000  # Use bulk insert if more than this many events

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def get_db_connection():
    """Get database connection with optimized settings"""
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args={
            "connect_timeout": 10,
            "autocommit": False,
            "init_command": "SET SESSION sql_mode='TRADITIONAL'"
        }
    )
    return engine

def bulk_insert_events(engine, events_data: List[Dict[str, Any]]) -> int:
    """Bulk insert events using raw SQL for maximum performance"""
    if not events_data:
        return 0
    
    inserted_count = 0
    
    # Prepare bulk insert data
    waf_logs_data = []
    security_events_data = []
    seen_ids = set()
    
    for event in events_data:
        # Skip duplicates in batch
        if event['event_id'] in seen_ids:
            continue
        seen_ids.add(event['event_id'])
        
        # Prepare waf_logs data
        waf_log = event['waf_log']
        waf_logs_data.append({
            'log_unique_id': waf_log['log_unique_id'],
            'timestamp': waf_log['timestamp'],
            'source_ip': waf_log['source_ip'],
            'source_port': waf_log.get('source_port'),
            'dest_ip': waf_log.get('dest_ip'),
            'dest_port': waf_log.get('dest_port'),
            'target_website': waf_log.get('target_website'),
            'method': waf_log['method'],
            'uri': waf_log['uri'][:4000] if waf_log['uri'] else '',  # Truncate if needed
            'status_code': waf_log['status_code'],
            'is_blocked': waf_log['is_blocked'],
            'is_attack': waf_log.get('is_attack', False),
            'attack_types': json.dumps(waf_log.get('attack_types', [])),
            'rule_ids': json.dumps(waf_log.get('rule_ids', [])),
            'rule_files': json.dumps(waf_log.get('rule_files', [])),
            'severity_score': waf_log.get('severity_score', 0),
            'anomaly_score': waf_log.get('anomaly_score', 0),
            'raw_log': json.dumps(waf_log.get('raw_log', {}))
        })
        
        # Prepare security_events data
        sec_event = event['security_event']
        security_events_data.append({
            'event_id': sec_event['event_id'],
            'timestamp': sec_event['timestamp'],
            'source_ip': sec_event['source_ip'],
            'source_port': sec_event.get('source_port'),
            'destination_ip': sec_event.get('destination_ip'),
            'destination_port': sec_event.get('destination_port'),
            'target_website': sec_event.get('target_website'),
            'uri': sec_event['uri'][:4000] if sec_event['uri'] else '',  # Truncate if needed
            'method': sec_event['method'],
            'status_code': sec_event['status_code'],
            'user_agent': sec_event.get('user_agent', ''),
            'attack_type': sec_event.get('attack_type'),
            'severity': sec_event.get('severity', 'low'),
            'is_attack': sec_event.get('is_attack', False),
            'is_blocked': sec_event['is_blocked'],
            'risk_score': sec_event.get('risk_score', 0.0),
            'anomaly_score': sec_event.get('anomaly_score', 0),
            'rules_matched': json.dumps(sec_event.get('rules_matched', [])),
            'rule_files': json.dumps(sec_event.get('rule_files', [])),
            'request_headers': json.dumps(sec_event.get('request_headers', {})),
            'request_body': sec_event.get('request_body', ''),
            'response_headers': json.dumps(sec_event.get('response_headers', {})),
            'response_body': sec_event.get('response_body', ''),
            'geo_location': json.dumps(sec_event.get('geo_location', {}))
        })
    
    with engine.begin() as conn:
        try:
            # Bulk insert waf_logs using INSERT IGNORE
            if waf_logs_data:
                conn.execute(
                    text("""
                        INSERT IGNORE INTO waf_logs 
                        (log_unique_id, timestamp, source_ip, source_port, dest_ip, dest_port,
                         target_website, method, uri, status_code, is_blocked, is_attack,
                         attack_types, rule_ids, rule_files, severity_score, anomaly_score, raw_log)
                        VALUES 
                        (:log_unique_id, :timestamp, :source_ip, :source_port, :dest_ip, :dest_port,
                         :target_website, :method, :uri, :status_code, :is_blocked, :is_attack,
                         :attack_types, :rule_ids, :rule_files, :severity_score, :anomaly_score, :raw_log)
                    """),
                    waf_logs_data
                )
            
            # Bulk insert security_events using INSERT IGNORE
            if security_events_data:
                result = conn.execute(
                    text("""
                        INSERT IGNORE INTO security_events
                        (event_id, timestamp, source_ip, source_port, destination_ip, destination_port,
                         target_website, uri, method, status_code, user_agent, attack_type, severity,
                         is_attack, is_blocked, risk_score, anomaly_score, rules_matched, rule_files,
                         request_headers, request_body, response_headers, response_body, geo_location)
                        VALUES
                        (:event_id, :timestamp, :source_ip, :source_port, :destination_ip, :destination_port,
                         :target_website, :uri, :method, :status_code, :user_agent, :attack_type, :severity,
                         :is_attack, :is_blocked, :risk_score, :anomaly_score, :rules_matched, :rule_files,
                         :request_headers, :request_body, :response_headers, :response_body, :geo_location)
                    """),
                    security_events_data
                )
                inserted_count = result.rowcount
            
            logging.info(f"Bulk inserted {inserted_count} events successfully")
            
        except Exception as e:
            logging.error(f"Bulk insert error: {e}")
            raise
    
    return inserted_count

def process_log_file_optimized(log_file_path: str, state_file_path: str):
    """Optimized log processing for initial load"""
    
    # Check if this is initial load
    is_initial_load = not os.path.exists(state_file_path) or os.path.getsize(state_file_path) == 0
    
    if is_initial_load:
        logging.info("Starting INITIAL LOAD - using optimized bulk processing")
        batch_size = INITIAL_LOAD_BATCH_SIZE
    else:
        batch_size = NORMAL_BATCH_SIZE
    
    # Get last position
    last_position = 0
    if os.path.exists(state_file_path):
        try:
            with open(state_file_path, 'r') as f:
                last_position = int(f.read().strip() or 0)
        except:
            last_position = 0
    
    if not os.path.exists(log_file_path):
        logging.error(f"Log file not found: {log_file_path}")
        return
    
    # Get file size for progress tracking
    file_size = os.path.getsize(log_file_path)
    
    if is_initial_load:
        logging.info(f"Processing {file_size} bytes of logs...")
    
    engine = get_db_connection()
    detection_engine = AttackDetectionEngine()
    
    events_buffer = []
    processed_count = 0
    total_processed = 0
    
    with open(log_file_path, 'r') as f:
        f.seek(last_position)
        
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
            
            try:
                # Fix common JSON issues
                line = line.replace('OWASP_CRS/4.17.1\\""', 'OWASP_CRS/4.17.1"')
                line = line.replace('OWASP_CRS/4.17.1""', 'OWASP_CRS/4.17.1"')
                line = re.sub(r'"components":\["OWASP_CRS/[^"]*\\+"*\]', '"components":["OWASP_CRS/4.17.1"]', line)
                
                log_data = json.loads(line)
                
                # Parse with attack detection
                parsed_data = detection_engine.analyze_log_entry(log_data)
                
                if parsed_data:
                    # Prepare event data
                    transaction = log_data.get("transaction", {})
                    event_id = hashlib.md5(f"{transaction.get('unique_id', '')}_{time.time()}".encode()).hexdigest()
                    
                    event_data = {
                        'event_id': event_id,
                        'waf_log': {
                            'log_unique_id': parsed_data['log_unique_id'],
                            'timestamp': parsed_data['timestamp'],
                            'source_ip': parsed_data.get('source_ip', 'unknown'),
                            'source_port': parsed_data.get('source_port'),
                            'dest_ip': parsed_data.get('dest_ip'),
                            'dest_port': parsed_data.get('dest_port'),
                            'target_website': parsed_data.get('target_website'),
                            'method': parsed_data['method'],
                            'uri': parsed_data['uri'],
                            'status_code': parsed_data['status_code'],
                            'is_blocked': parsed_data['is_blocked'],
                            'is_attack': parsed_data.get('is_attack', False),
                            'attack_types': parsed_data.get('attack_types', []),
                            'rule_ids': parsed_data.get('rule_ids', []),
                            'rule_files': parsed_data.get('rule_files', []),
                            'severity_score': parsed_data.get('severity_score', 0),
                            'anomaly_score': parsed_data.get('anomaly_score', 0),
                            'raw_log': log_data
                        },
                        'security_event': {
                            'event_id': event_id,
                            'timestamp': parsed_data['timestamp'],
                            'source_ip': parsed_data.get('source_ip', 'unknown'),
                            'source_port': parsed_data.get('source_port'),
                            'destination_ip': parsed_data.get('dest_ip'),
                            'destination_port': parsed_data.get('dest_port'),
                            'target_website': parsed_data.get('target_website'),
                            'uri': parsed_data['uri'],
                            'method': parsed_data['method'],
                            'status_code': parsed_data['status_code'],
                            'user_agent': transaction.get('request', {}).get('headers', {}).get('User-Agent', ''),
                            'attack_type': parsed_data.get('attack_type'),
                            'severity': parsed_data.get('severity', 'low'),
                            'is_attack': parsed_data.get('is_attack', False),
                            'is_blocked': parsed_data['is_blocked'],
                            'risk_score': parsed_data.get('risk_score', 0.0),
                            'anomaly_score': parsed_data.get('anomaly_score', 0),
                            'rules_matched': parsed_data.get('rule_ids', []),
                            'rule_files': parsed_data.get('rule_files', []),
                            'request_headers': transaction.get('request', {}).get('headers', {}),
                            'request_body': transaction.get('request', {}).get('body', ''),
                            'response_headers': transaction.get('response', {}).get('headers', {}),
                            'response_body': transaction.get('response', {}).get('body', ''),
                            'geo_location': None
                        }
                    }
                    
                    events_buffer.append(event_data)
                    processed_count += 1
                
            except json.JSONDecodeError as e:
                logging.debug(f"JSON decode error at line {line_num}: {e}")
                continue
            except Exception as e:
                logging.debug(f"Error processing line {line_num}: {e}")
                continue
            
            # Process batch when buffer is full
            if len(events_buffer) >= batch_size:
                try:
                    inserted = bulk_insert_events(engine, events_buffer)
                    total_processed += inserted
                    
                    # Progress tracking for initial load
                    if is_initial_load:
                        current_position = f.tell()
                        progress = (current_position / file_size) * 100
                        logging.info(f"Progress: {progress:.1f}% - Processed {total_processed} events")
                    
                    events_buffer = []
                    
                except Exception as e:
                    logging.error(f"Failed to insert batch: {e}")
                    events_buffer = []
        
        # Process remaining events
        if events_buffer:
            try:
                inserted = bulk_insert_events(engine, events_buffer)
                total_processed += inserted
            except Exception as e:
                logging.error(f"Failed to insert final batch: {e}")
        
        # Save position
        new_position = f.tell()
        with open(state_file_path, 'w') as state_f:
            state_f.write(str(new_position))
    
    logging.info(f"Processing complete! Total events processed: {total_processed}")
    
    if is_initial_load:
        logging.info("Initial load completed. Switching to normal monitoring mode.")

def main():
    """Main entry point for optimized log processor"""
    logging.info("Starting OPTIMIZED log processor service")
    
    # Wait for database to be ready
    max_retries = 10
    for i in range(max_retries):
        try:
            engine = get_db_connection()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logging.info("Database connection successful")
            break
        except Exception as e:
            logging.error(f"Database connection attempt {i+1}/{max_retries} failed: {e}")
            if i < max_retries - 1:
                time.sleep(5)
            else:
                raise
    
    # Main processing loop
    while True:
        try:
            process_log_file_optimized(LOG_FILE_PATH, STATE_FILE_PATH)
            
            # Check for new logs every 0.5 seconds
            time.sleep(0.5)
            
        except Exception as e:
            logging.error(f"Error in main loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()