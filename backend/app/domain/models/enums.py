from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"  
    MODERATOR = "moderator"

class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
