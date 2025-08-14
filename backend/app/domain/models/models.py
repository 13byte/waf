from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, BigInteger, JSON, Enum, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .enums import UserRole

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    profile_image = Column(String(255))
    bio = Column(Text)
    created_at = Column(TIMESTAMP, default=func.now())
    updated_at = Column(TIMESTAMP, default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    sessions = relationship("UserSession", back_populates="user")

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    expires_at = Column(TIMESTAMP, nullable=False)
    is_active = Column(Boolean, default=True)
    
    user = relationship("User", back_populates="sessions")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    table_name = Column(String(50), nullable=False)
    record_id = Column(Integer, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())

class WafLog(Base):
    __tablename__ = "waf_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    unique_id = Column(String(255), unique=True, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    source_ip = Column(String(45), nullable=False)
    host = Column(String(255))
    uri = Column(Text)
    method = Column(String(10))
    status_code = Column(Integer)
    matched_rules = Column(JSON)
    action = Column(String(50))
    raw_log = Column(Text)
    created_at = Column(TIMESTAMP, default=func.now())

class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False)
    source_ip = Column(String(45), nullable=False)
    destination_ip = Column(String(45))
    attack_type = Column(String(100))
    severity = Column(String(20))
    domain = Column(String(255))
    uri = Column(Text)
    method = Column(String(10))
    status_code = Column(Integer)
    payload = Column(Text)
    user_agent = Column(Text)
    blocked = Column(Boolean, default=False)
    risk_score = Column(Integer)
    rule_ids = Column(JSON)
    message = Column(Text)
    raw_event = Column(JSON)
    created_at = Column(TIMESTAMP, default=func.now())

class WafConfig(Base):
    __tablename__ = "waf_config"
    
    id = Column(Integer, primary_key=True, index=True)
    paranoia_level = Column(Integer, default=1)
    rule_engine = Column(Boolean, default=True)
    audit_engine = Column(Boolean, default=True)
    anomaly_threshold = Column(Integer, default=5)
    blocked_ips = Column(JSON)
    custom_rules = Column(JSON)
    updated_at = Column(TIMESTAMP, default=func.now(), onupdate=func.now())
    updated_by = Column(Integer, ForeignKey("users.id"))