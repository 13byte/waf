# WAF configuration domain model
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from ...infrastructure.timezone import get_kst_now

Base = declarative_base()

class WafConfig(Base):
    __tablename__ = "waf_config"
    
    id = Column(Integer, primary_key=True)
    config_name = Column(String(100), unique=True, nullable=False)
    
    # Core settings
    paranoia_level = Column(Integer, default=1)
    rule_engine = Column(Boolean, default=True)
    audit_engine = Column(Boolean, default=True)
    anomaly_threshold = Column(Integer, default=5)
    
    # IP management
    blocked_ips = Column(JSON, default=list)
    allowed_ips = Column(JSON, default=list)
    
    # Custom rules
    custom_rules = Column(JSON, default=list)
    
    # Metadata
    updated_at = Column(DateTime, default=get_kst_now, onupdate=get_kst_now)
    updated_by = Column(String(100))
    
class CustomRule(Base):
    __tablename__ = "custom_rules"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    pattern = Column(String(500), nullable=False)
    action = Column(String(20), nullable=False)  # block, allow, log, redirect
    enabled = Column(Boolean, default=True)
    priority = Column(Integer, default=100)
    
    created_at = Column(DateTime, default=get_kst_now)
    created_by = Column(String(100))