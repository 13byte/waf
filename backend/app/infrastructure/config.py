from pydantic_settings import BaseSettings
from typing import List
import os
import secrets
from .constants import (
    MAX_UPLOAD_SIZE,
    CACHE_TTL_SECONDS,
    BACKEND_HOST,
    BACKEND_PORT
)

class Settings(BaseSettings):
    # Database settings from environment - NO DEFAULTS FOR PASSWORDS
    db_host: str = os.getenv("DB_HOST", "database")
    db_port: int = int(os.getenv("DB_PORT", "3306"))
    db_name: str = os.getenv("DB_NAME", "waf_test_db")
    db_user: str = os.getenv("DB_USER", "waf_user")
    db_password: str = os.getenv("DB_PASSWORD", "")  # No default password
    
    # Security settings - use environment or generate secure defaults
    secret_key: str = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY") or secrets.token_urlsafe(32)
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Server settings
    backend_host: str = BACKEND_HOST
    backend_port: int = BACKEND_PORT
    
    # File upload settings
    upload_dir: str = os.getenv("UPLOAD_DIR", "/app/uploads")
    max_file_size: int = MAX_UPLOAD_SIZE
    allowed_extensions: str = "jpg,jpeg,png,gif,pdf,txt,doc,docx,exe,bat,sh,php,asp,jsp"
    
    # Cache settings
    cache_ttl: int = CACHE_TTL_SECONDS
    
    # CORS settings
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost,http://localhost:3000,http://localhost:5173")
    api_version: str = "v1"
    
    # Application settings
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    # OAuth settings
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    
    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.allowed_extensions.split(",")]
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields in .env file

settings = Settings()