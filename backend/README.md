# WAF Security Operations Center - Backend

FastAPI 0.116.1 backend service with Domain-Driven Design architecture for WAF monitoring and attack detection.

## Architecture

### Domain-Driven Design Structure

```
backend/app/
├── domain/             # Business logic and entities
│   ├── models/         # Domain models (SecurityEvent, User, WafConfig)
│   ├── repositories/   # Repository interfaces
│   └── services/       # Domain services (SecurityAnalysisService)
├── application/        # Application services and DTOs
│   ├── dtos/          # Data transfer objects
│   └── services/      # Application services
├── infrastructure/     # External concerns
│   ├── auth/          # Authentication and authorization
│   ├── repositories/  # Repository implementations
│   ├── database.py    # Database configuration
│   ├── cache.py       # In-memory caching
│   └── config.py      # Application settings
└── presentation/       # API layer
    ├── routers/       # FastAPI routers
    └── dependencies.py # Dependency injection
```

## Core Models

### SecurityEvent
Main entity for security event storage with enhanced attack classification.

```python
class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True)
    event_id = Column(String(255), unique=True, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    source_ip = Column(String(50), nullable=False)
    attack_type = Column(String(50))
    severity = Column(String(20))
    is_blocked = Column(Boolean, default=False)
    is_attack = Column(Boolean, default=False)
    anomaly_score = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)
    # ... additional fields
```

### User
User management with role-based access control.

```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    created_at = Column(TIMESTAMP, default=func.now())
```

## Services

### SecurityAnalysisService
Domain service for security event analysis and threat assessment.

**Key Methods:**
- `calculate_threat_level(events)` - Analyzes threat level from event patterns
- `identify_suspicious_ips(events)` - Identifies potentially malicious IP addresses
- `calculate_risk_score(event)` - Calculates individual event risk scores

### Authentication Service
Handles user authentication and JWT token management.

**Features:**
- BCrypt password hashing
- JWT token generation and validation
- Role-based access control
- Session management

## API Routers

### `/api/auth`
User authentication and management endpoints.
- `POST /login` - User authentication
- `POST /register` - User registration
- `GET /me` - Current user information

### `/api/security-events`
Security event management and monitoring.
- `GET /` - List events with filtering and pagination
- `GET /{id}` - Event details with raw audit logs
- `GET /by-ip/{ip}` - Events grouped by source IP
- `WS /stream` - Real-time WebSocket event stream

### `/api/dashboard`
Dashboard statistics and summaries.
- `GET /stats` - Dashboard statistics with threat analysis
- `GET /recent-events` - Recent security events
- `GET /attack-patterns` - Attack pattern analysis

### `/api/analytics`
Advanced analytics and reporting.
- `GET /aggregated-stats` - Detailed statistics with time-based aggregation
- `GET /comparison` - Period comparison analysis
- `GET /drill-down/{chart_type}` - Drill-down data for charts

### `/api/vulnerable`
Attack testing laboratory (no authentication required).
- XSS, SQL Injection, Path Traversal testing
- Command Injection, File Upload, XXE testing
- SSTI, SSRF, Header Manipulation testing

## Database Layer

### Repository Pattern
Abstract repository interfaces in domain layer with concrete implementations in infrastructure.

```python
class ISecurityEventRepository(ABC):
    @abstractmethod
    async def get_all(self, skip: int, limit: int, filters: Dict) -> tuple[List[SecurityEvent], int]:
        pass
    
    @abstractmethod
    async def get_by_id(self, event_id: str) -> Optional[SecurityEvent]:
        pass
```

### Database Configuration
- **Engine**: SQLAlchemy with PyMySQL driver
- **Connection Pool**: Pre-ping enabled with 300s recycle
- **Timezone**: Asia/Seoul (UTC+9)
- **Charset**: UTF8MB4 with unicode collation

## Authentication & Security

### JWT Configuration
- **Algorithm**: HS256
- **Expiration**: 30 minutes (configurable)
- **Secret Key**: Environment variable or auto-generated

### Password Security
- **Hashing**: BCrypt with salt
- **Validation**: Strong password requirements
- **Session Management**: JWT tokens with expiration

### CORS Configuration
- **Origins**: Configurable via environment
- **Credentials**: Enabled for authenticated requests
- **Methods**: All HTTP methods allowed

## Environment Configuration

### Database Settings
```bash
DB_HOST=database           # Database host
DB_PORT=3306              # Database port
DB_NAME=waf_test_db       # Database name
DB_USER=waf_user          # Database user
DB_PASSWORD=waf_pass123   # Database password
```

### Security Settings
```bash
SECRET_KEY=your-secret-key      # JWT secret key
ACCESS_TOKEN_EXPIRE_MINUTES=30  # Token expiration
ALGORITHM=HS256                 # JWT algorithm
```

### Application Settings
```bash
DEBUG=false               # Debug mode
LOG_LEVEL=INFO           # Logging level
CORS_ORIGINS=http://localhost:3000  # Allowed origins
```

## Cache Management

### In-Memory Cache
Simple cache manager for performance optimization:
- **TTL Support**: Configurable time-to-live
- **Automatic Cleanup**: Background task removes expired entries
- **Dashboard Stats**: 5-minute cache for statistics
- **Thread Safe**: Async lock for concurrent access

## WebSocket Implementation

### Real-time Event Streaming
- **Connection Management**: Active connection tracking
- **Event Filtering**: Broadcasts only critical events (HIGH severity or blocked)
- **Heartbeat**: Keep-alive messages for connection health
- **Error Handling**: Graceful disconnection management

## Development

### Local Development
```bash
# Access running container
docker exec -it waf_backend bash

# Install dependencies with uv
uv sync

# Run development server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Dependencies
**Core:**
- FastAPI 0.116.1 - Web framework
- SQLAlchemy - ORM and database toolkit
- PyMySQL - MySQL database driver
- Pydantic - Data validation and serialization

**Security:**
- python-jose - JWT token handling
- passlib[bcrypt] - Password hashing
- cryptography - Cryptographic operations

**Additional:**
- uvicorn - ASGI server
- python-multipart - File upload support
- aiofiles - Async file operations
- websockets - WebSocket support

### Testing
```bash
# Install test dependencies
uv add pytest pytest-asyncio httpx --dev

# Run tests
uv run pytest
```

## API Documentation

### Interactive Documentation
- **Swagger UI**: `http://localhost/api/docs`
- **ReDoc**: `http://localhost/api/redoc`
- **OpenAPI Schema**: Auto-generated from FastAPI

### Health Check
```http
GET /health

Response:
{
  "status": "healthy",
  "database": "connected",
  "cache": "active",
  "version": "v1"
}
```

## Performance Optimization

### Database Queries
- **Indexes**: Composite indexes for common query patterns
- **Pagination**: Limit-offset pagination with count optimization
- **Filtering**: Efficient WHERE clauses with proper index usage

### Caching Strategy
- **Statistics Cache**: 5-minute TTL for dashboard data
- **Query Results Cache**: Short-term caching for expensive queries
- **Memory Management**: Automatic cleanup of expired entries

### Connection Management
- **Pool Size**: Configured based on expected load
- **Connection Recycling**: 300-second connection lifetime
- **Health Checks**: Pre-ping to validate connections

## Error Handling

### Standard Error Responses
- **HTTP Status Codes**: Standard RESTful status codes
- **Error Messages**: Clear, actionable error descriptions
- **Validation Errors**: Detailed field-level validation feedback

### Exception Handling
- **Global Exception Handler**: Catches and formats unhandled exceptions
- **Database Errors**: Proper handling of connection and query errors
- **Business Logic Errors**: Domain-specific error responses

## Logging

### Log Configuration
- **Level**: Configurable via LOG_LEVEL environment variable
- **Format**: Structured logging with timestamps and levels
- **Destinations**: Console output for containerized deployment

### Security Events
- **Attack Detection**: Logs all detected attacks with details
- **Authentication**: Logs login attempts and token operations
- **System Events**: Logs service startup and configuration changes