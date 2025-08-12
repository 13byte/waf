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
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    files = relationship("File", back_populates="uploader")
    sessions = relationship("UserSession", back_populates="user")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, default=func.now())
    is_active = Column(Boolean, default=True)
    posts = relationship("Post", back_populates="category")

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    image_url = Column(String(255))
    created_at = Column(TIMESTAMP, default=func.now())
    updated_at = Column(TIMESTAMP, default=func.now(), onupdate=func.now())
    is_published = Column(Boolean, default=True)
    author = relationship("User", back_populates="posts")
    category = relationship("Category", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    files = relationship("File", back_populates="post")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    like_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, default=func.now())
    updated_at = Column(TIMESTAMP, default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")
    parent = relationship("Comment", remote_side=[id], back_populates="replies")
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")

class WafLog(Base):
    __tablename__ = "waf_logs"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    log_unique_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Timestamp
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # Network Information
    source_ip = Column(String(50), nullable=False, index=True)
    source_port = Column(Integer)
    dest_ip = Column(String(50))
    dest_port = Column(Integer)
    target_website = Column(String(255))
    
    # Request Information
    method = Column(String(10), nullable=False)
    uri = Column(String(2048), nullable=False, index=True)
    status_code = Column(Integer, nullable=False, index=True)
    
    # Attack Detection
    is_blocked = Column(Boolean, nullable=False, index=True)
    is_attack = Column(Boolean, nullable=False, index=True)
    attack_types = Column(JSON)
    rule_ids = Column(JSON)
    rule_files = Column(JSON)
    severity_score = Column(Integer, default=0)
    anomaly_score = Column(Integer, default=0)
    
    # Raw Data
    raw_log = Column(JSON)
    
    # Audit Trail
    created_at = Column(TIMESTAMP, default=func.now())

class File(Base):
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    filesize = Column(BigInteger, nullable=False)
    mimetype = Column(String(100), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    upload_time = Column(TIMESTAMP, default=func.current_timestamp())
    is_active = Column(Boolean, default=True)
    
    post = relationship("Post", back_populates="files")
    uploader = relationship("User", back_populates="files")

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

class PostView(Base):
    __tablename__ = "post_views"
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    viewed_at = Column(TIMESTAMP, default=func.current_timestamp())