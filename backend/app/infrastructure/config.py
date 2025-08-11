from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "waf_test_db"
    db_user: str = "waf_user"
    db_password: str = "waf_pass123"
    
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    upload_dir: str = "/app/uploads"
    max_file_size: int = 10485760
    allowed_extensions: str = "jpg,jpeg,png,gif,pdf,txt,doc,docx,exe,bat,sh,php,asp,jsp"
    
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    api_version: str = "v1"
    
    debug: bool = True
    log_level: str = "INFO"
    
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

settings = Settings()