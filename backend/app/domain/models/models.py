from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, BigInteger, JSON, Enum, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .enums import UserRole, SeverityLevel

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth users
    role = Column(Enum(UserRole), default=UserRole.USER)
    profile_image = Column(String(255))
    bio = Column(Text)
    
    # OAuth fields
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    is_oauth_user = Column(Boolean, default=False)
    full_name = Column(String(255), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    last_login = Column(TIMESTAMP, nullable=True)
    
    created_at = Column(TIMESTAMP, default=func.now())
    updated_at = Column(TIMESTAMP, default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    sessions = relationship("UserSession", back_populates="user")
    
    def set_password(self, password: str = None):
        """Set password hash - OAuth users may not have passwords"""
        if password:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            self.password_hash = pwd_context.hash(password)
        else:
            self.password_hash = None
    
    def verify_password(self, password: str) -> bool:
        """Verify password - OAuth users cannot use password login"""
        if not self.password_hash:
            return False
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(password, self.password_hash)

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
    
    id = Column(BigInteger, primary_key=True, index=True)
    log_unique_id = Column(String(255), unique=True, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    source_ip = Column(String(50), nullable=False)
    source_port = Column(Integer)
    dest_ip = Column(String(50))
    dest_port = Column(Integer)
    target_website = Column(String(255))
    method = Column(String(10))
    uri = Column(String(2048))
    status_code = Column(Integer)
    is_blocked = Column(Boolean, default=False)
    is_attack = Column(Boolean, default=False)
    attack_types = Column(JSON)
    rule_ids = Column(JSON)
    rule_files = Column(JSON)
    severity_score = Column(Integer, default=0)
    anomaly_score = Column(Integer, default=0)
    raw_log = Column(JSON)

class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(BigInteger, primary_key=True, index=True)
    event_id = Column(String(50), unique=True, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    source_ip = Column(String(45), nullable=False)
    source_port = Column(Integer)
    destination_ip = Column(String(45))
    method = Column(String(10))
    uri = Column(Text)
    query_string = Column(Text)
    status_code = Column(Integer)
    user_agent = Column(Text)
    referer = Column(Text)
    request_headers = Column(JSON)
    request_body = Column(Text)
    response_headers = Column(JSON)
    response_body = Column(Text)
    matched_rules = Column(JSON)
    anomaly_score = Column(Integer, default=0)
    severity = Column(Enum(SeverityLevel), default=SeverityLevel.LOW)
    attack_type = Column(String(50))
    is_blocked = Column(Boolean, default=False)
    is_attack = Column(Boolean, default=False)
    country = Column(String(50))
    city = Column(String(100))
    response_time = Column(Integer)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())

class WafConfig(Base):
    __tablename__ = "waf_config"
    
    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String(100), unique=True, nullable=False)
    config_value = Column(JSON, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, default=func.current_timestamp(), onupdate=func.current_timestamp())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))