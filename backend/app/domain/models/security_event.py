# Security event domain model
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Float, Index
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from enum import Enum

Base = declarative_base()

class AttackType(str, Enum):
    XSS = "XSS"
    SQL_INJECTION = "SQLI"
    PATH_TRAVERSAL = "LFI"
    REMOTE_FILE_INCLUSION = "RFI"
    COMMAND_INJECTION = "RCE"
    PHP_INJECTION = "PHP"
    SCANNER = "SCANNER"
    PROTOCOL_VIOLATION = "PROTOCOL"

class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Timestamp
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # Network info
    source_ip = Column(String(50), nullable=False, index=True)
    source_port = Column(Integer)
    dest_ip = Column(String(50))
    dest_port = Column(Integer)
    
    # Request info
    method = Column(String(10), nullable=False)
    uri = Column(String(2048), nullable=False)
    target_website = Column(String(255), index=True)
    status_code = Column(Integer, nullable=False, index=True)
    
    # Security analysis
    attack_type = Column(String(50), index=True)
    severity = Column(String(20), nullable=False, index=True)
    is_blocked = Column(Boolean, default=False, index=True)
    is_attack = Column(Boolean, default=False, index=True)
    
    # Scores
    anomaly_score = Column(Integer, default=0)
    severity_score = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)
    
    # Rule info
    rule_ids = Column(JSON)
    rule_files = Column(JSON)
    
    # Raw data
    raw_log = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes for better performance
    __table_args__ = (
        Index('idx_timestamp_attack', 'timestamp', 'is_attack'),
        Index('idx_source_ip_timestamp', 'source_ip', 'timestamp'),
        Index('idx_attack_type_severity', 'attack_type', 'severity'),
    )