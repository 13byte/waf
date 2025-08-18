"""
Application constants and configuration values
"""
import os

# ============================================
# File Size Limits
# ============================================
KB = 1024
MB = KB * 1024
GB = MB * 1024

DEFAULT_MAX_UPLOAD_SIZE = 10 * MB
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", DEFAULT_MAX_UPLOAD_SIZE))

GEOIP_MAX_SIZE = int(os.getenv("GEOIP_MAX_SIZE", 500 * MB))

# ============================================
# Network Configuration
# ============================================
DEFAULT_BACKEND_HOST = "0.0.0.0"
DEFAULT_BACKEND_PORT = 8000

BACKEND_HOST = os.getenv("BACKEND_HOST", DEFAULT_BACKEND_HOST)
BACKEND_PORT = int(os.getenv("BACKEND_PORT", DEFAULT_BACKEND_PORT))

# ============================================
# Cache Configuration
# ============================================
DEFAULT_CACHE_TTL = 300  # 5 minutes
DEFAULT_CACHE_CLEANUP_INTERVAL = 600  # 10 minutes

CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", DEFAULT_CACHE_TTL))
CACHE_CLEANUP_INTERVAL = int(os.getenv("CACHE_CLEANUP_INTERVAL", DEFAULT_CACHE_CLEANUP_INTERVAL))

# ============================================
# Security Thresholds
# ============================================
ANOMALY_SCORE_THRESHOLD = int(os.getenv("ANOMALY_SCORE_THRESHOLD", 5))

# Severity Scores
CRITICAL_SEVERITY_SCORE = int(os.getenv("CRITICAL_SEVERITY_SCORE", 90))
HIGH_SEVERITY_SCORE = int(os.getenv("HIGH_SEVERITY_SCORE", 70))
MEDIUM_SEVERITY_SCORE = int(os.getenv("MEDIUM_SEVERITY_SCORE", 40))
LOW_SEVERITY_SCORE = int(os.getenv("LOW_SEVERITY_SCORE", 20))

# Attack Detection
ATTACK_RATE_LIMIT = int(os.getenv("ATTACK_RATE_LIMIT", 100))
ATTACK_TIME_WINDOW = int(os.getenv("ATTACK_TIME_WINDOW", 60))  # seconds
BLOCK_DURATION = int(os.getenv("BLOCK_DURATION", 3600))  # 1 hour
MAX_REQUESTS_PER_IP = int(os.getenv("MAX_REQUESTS_PER_IP", 1000))

# ============================================
# CRS Rules Paths (for CRS rules viewer)
# ============================================
CRS_RULES_PATH = os.getenv("CRS_RULES_PATH", "/opt/owasp-crs/rules")
CUSTOM_RULES_PATH = os.getenv("CUSTOM_RULES_PATH", "/etc/modsecurity/custom-rules")

# ============================================
# Database Configuration
# ============================================
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", 5))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", 10))
DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", 300))
DB_POOL_PRE_PING = os.getenv("DB_POOL_PRE_PING", "true").lower() == "true"

# ============================================
# API Configuration
# ============================================
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
DEFAULT_TIMEOUT = 30  # seconds

# Private IP Ranges for detection
PRIVATE_IP_RANGES = [
    "192.168.",
    "10.",
    "172.16.", "172.17.", "172.18.", "172.19.",
    "172.20.", "172.21.", "172.22.", "172.23.",
    "172.24.", "172.25.", "172.26.", "172.27.",
    "172.28.", "172.29.", "172.30.", "172.31.",
    "127.0.0.1",
    "::1"
]

# ============================================
# Log Processing
# ============================================
LOG_PROCESSOR_BATCH_SIZE = int(os.getenv("LOG_PROCESSOR_BATCH_SIZE", 100))
LOG_PROCESSOR_INTERVAL = float(os.getenv("LOG_PROCESSOR_INTERVAL", 0.5))

# ============================================
# Timeouts (milliseconds for frontend compatibility)
# ============================================
WEBSOCKET_TIMEOUT = 30000  # 30 seconds
API_REQUEST_TIMEOUT = 5000  # 5 seconds
NOTIFICATION_DISPLAY_TIME = 3000  # 3 seconds

# ============================================
# Demo/Test Values
# ============================================
# These should only be used in test/demo endpoints
DEMO_API_KEYS = ["demo_key_only_for_testing"]
DEMO_IPS = ["127.0.0.1", "192.168.1.1", "10.0.0.1"]