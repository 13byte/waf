# WAF Security Operations Center

Real-time web application firewall monitoring and attack testing platform.

## Services

- **nginx-waf**: ModSecurity + OWASP CRS entry point (port 80)
- **frontend**: React 18 dashboard with real-time monitoring
- **backend**: FastAPI 0.116.1 API server with DDD architecture
- **database**: MySQL 8.0 for event storage
- **log-processor**: Real-time ModSecurity log parser

## Tech Stack

- **WAF**: ModSecurity + OWASP CRS 4.17.1 (Paranoia Level 1)
- **Frontend**: React 18 + TypeScript + TailwindCSS + Chart.js
- **Backend**: FastAPI 0.116.1 + Python 3.12 + SQLAlchemy
- **Database**: MySQL 8.0 with optimized indexes
- **Real-time**: WebSocket for live event streaming

## Features

### Real-time Monitoring
- Live security event dashboard with WebSocket
- Attack pattern analysis and threat scoring
- IP reputation tracking and geo-location
- Rule-based detection with anomaly scoring
- CSV export for security reports

### Attack Testing Lab
- **XSS**: Script injection, event handlers, encoding bypass
- **SQL Injection**: Union, time-based, error-based, NoSQL
- **Path Traversal**: Directory traversal with filter bypass
- **Command Injection**: Shell execution with multiple methods
- **File Upload**: Extension bypass and malicious file upload
- **XXE**: XML external entity injection
- **SSTI**: Server-side template injection (Jinja2)
- **SSRF**: Server-side request forgery
- **Header Manipulation**: User-agent bypass and privilege escalation

## Quick Start

```bash
# Start all services
chmod +x manage.sh
./manage.sh start

# Check status
./manage.sh status

# Access dashboard
open http://localhost
```

**Default Login**: `admin` / `admin123`

## Management Commands

```bash
./manage.sh start     # Start all services
./manage.sh stop      # Stop all services
./manage.sh restart   # Restart services
./manage.sh status    # Health check
./manage.sh logs      # View all logs
./manage.sh logs [service]  # View specific service logs
./manage.sh build     # Rebuild images
./manage.sh clean     # Remove everything
./manage.sh dev       # Development mode (React dev server)
```

## Architecture

```
waf/
├── frontend/           # React 18 + TypeScript Dashboard
│   ├── src/
│   │   ├── domain/        # Business models and services
│   │   ├── application/   # Use cases and DTOs
│   │   ├── infrastructure/# API client and repositories
│   │   └── presentation/  # UI components and pages
│   └── package.json
├── backend/            # FastAPI 0.116.1 Server
│   ├── app/
│   │   ├── domain/        # Models and domain services
│   │   ├── application/   # Application services and DTOs
│   │   ├── infrastructure/# Database, cache, auth
│   │   └── presentation/  # API routers and dependencies
│   └── pyproject.toml
├── log_processor/      # Real-time log processing
├── nginx/              # ModSecurity + CRS configuration
├── db/                 # MySQL initialization scripts
└── docker-compose.yml  # Service orchestration
```

## API Endpoints

### Security Events
```http
GET    /api/security-events           # List events with filters
GET    /api/security-events/{id}      # Event details
GET    /api/security-events/by-ip/{ip} # Events by source IP
POST   /api/security-events/export    # CSV export
WS     /api/ws/security-events        # Real-time stream
```

### Dashboard & Analytics
```http
GET    /api/dashboard/stats           # Dashboard statistics
GET    /api/dashboard/recent-events   # Recent security events
GET    /api/analytics/aggregated-stats # Detailed analytics
GET    /api/analytics/comparison      # Period comparison
```

### Attack Testing Lab
```http
GET    /api/vulnerable/xss            # XSS testing
GET    /api/vulnerable/sqli           # SQL injection testing
GET    /api/vulnerable/path-traversal # Path traversal testing
GET    /api/vulnerable/command-injection # Command injection
POST   /api/vulnerable/file-upload    # File upload testing
POST   /api/vulnerable/xxe            # XXE injection testing
GET    /api/vulnerable/ssti           # Template injection
GET    /api/vulnerable/ssrf           # SSRF testing
GET    /api/vulnerable/header-manipulation # Header manipulation
```

### Authentication
```http
POST   /api/auth/login               # User authentication
POST   /api/auth/register            # User registration
GET    /api/auth/me                  # Current user info
```

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev     # Dev server on http://localhost:5173
npm run build   # Production build
```

### Backend Development
```bash
cd backend
# Container access for development
docker exec -it waf_backend bash
```

### Database Access
```bash
# Connect to MySQL
docker exec -it waf_database mysql -u waf_user -p
# Password: waf_pass123
# Database: waf_test_db
```

### Log Monitoring
```bash
# ModSecurity audit logs
tail -f logs/modsecurity/audit.log

# Service logs
docker-compose logs -f backend
docker-compose logs -f log-processor
```

## Database Schema

### Core Tables
- **security_events**: New architecture with enhanced attack classification
- **waf_logs**: Legacy compatibility for raw ModSecurity audit logs
- **users**: User management with role-based access
- **waf_config**: WAF configuration and custom rules

### Key Features
- Optimized indexes for real-time queries
- Dual table approach for backward compatibility
- Time-based partitioning ready
- Full-text search capabilities

## Configuration

### WAF Settings (docker-compose.yml)
```yaml
MODSEC_RULE_ENGINE: on           # Enable ModSecurity
PARANOIA: 1                      # CRS paranoia level (1-4)
MODSEC_AUDIT_LOG_FORMAT: JSON    # JSON audit logs
```

### Environment Variables
```bash
# Backend (.env)
DB_HOST=database
DB_NAME=waf_test_db
SECRET_KEY=your-secret-key
DEBUG=false

# Frontend (.env)
VITE_API_BASE_URL=/api
```

## Attack Detection Logic

### Rule-Based Detection
- OWASP CRS pattern matching: `REQUEST-9XX-APPLICATION-ATTACK-*`
- Custom rule support: `CUSTOM-XXX-ATTACK-*`
- Anomaly scoring with configurable thresholds (default: 5)

### Blocking Decision
- Primary: Blocking evaluation rule (949110) with anomaly score ≥5
- Secondary: Attack rules with 403 status code
- Detection-only mode for scores below threshold

### Event Classification
```
Critical: High anomaly score + blocked + multiple attack types
High:     Attack detected + blocked OR high anomaly score
Medium:   Attack detected + moderate score
Low:      Minor anomalies + unblocked
```

## Troubleshooting

### WAF Not Blocking
1. Check paranoia level: `PARANOIA=1` in docker-compose.yml
2. Verify engine status: `MODSEC_RULE_ENGINE=on`
3. Monitor audit logs: `tail -f logs/modsecurity/audit.log`

### Missing Events
1. Check log-processor status: `docker ps | grep log-processor`
2. Verify database connection
3. Review processor logs: `docker-compose logs log-processor`

### WebSocket Issues
1. Ensure backend is running and healthy
2. Check nginx proxy configuration
3. Verify endpoint: `/api/ws/security-events`

### Database Connection
1. Confirm MySQL container: `docker ps | grep database`
2. Check credentials in docker-compose.yml
3. Test connection: `docker exec -it waf_database mysql -u waf_user -p`

## Performance Notes

- Log processing: 0.5s polling interval for real-time detection
- Database queries: Optimized with composite indexes
- WebSocket: Broadcasts only critical events (HIGH severity or blocked)
- Caching: 5-minute TTL for dashboard statistics
- CSV export: Handles up to 100k events efficiently