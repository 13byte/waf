# WAF Security Operations Center

Real-time web application firewall monitoring and attack testing platform with OWASP CRS rule viewer.

## Features

### Real-time Security Monitoring
- Live dashboard with WebSocket event streaming
- Attack pattern analysis and threat scoring
- IP reputation tracking with geo-location
- Anomaly-based detection with configurable thresholds
- CSV export for security reports and analysis

### CRS Rules Viewer
- Browse all 681 OWASP Core Rule Set configurations
- Real-time statistics: 307 critical/error rules identified
- Advanced search across all rule files
- Detailed rule inspection with parsed and raw data views
- Shared volume architecture for container rule access

### Attack Testing Laboratory
- **XSS**: Script injection, event handlers, encoding bypass
- **SQL Injection**: Union, time-based, error-based, NoSQL
- **Path Traversal**: Directory traversal with filter bypass
- **Command Injection**: Shell execution testing
- **File Upload**: Extension bypass and malicious uploads
- **XXE**: XML external entity injection
- **SSTI**: Server-side template injection
- **SSRF**: Server-side request forgery
- **Header Manipulation**: User-agent and privilege escalation

## Quick Start

```bash
# Start all services
chmod +x manage.sh
./manage.sh start

# Check service health
./manage.sh status

# Access dashboard
open http://localhost
```

**Default Credentials**: `admin` / `admin123`

## Tech Stack

- **WAF**: ModSecurity 2.9 + OWASP CRS 4.17.1
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: FastAPI 0.116.1 + Python 3.12 + SQLAlchemy
- **Database**: MySQL 8.0 with optimized indexes
- **Real-time**: WebSocket for live event streaming
- **Container**: Docker Compose orchestration

## Architecture

```
waf/
├── frontend/           # React 18 Dashboard
│   ├── src/
│   │   ├── domain/        # Business entities
│   │   ├── application/   # Use cases
│   │   ├── infrastructure/# API client
│   │   └── presentation/  # UI components
│   └── package.json
├── backend/            # FastAPI Server
│   ├── app/
│   │   ├── domain/        # Core business logic
│   │   ├── application/   # Service layer
│   │   ├── infrastructure/# Database, auth
│   │   └── presentation/  # API routes
│   └── pyproject.toml
├── nginx/              # ModSecurity + CRS
│   ├── templates/         # Nginx config
│   ├── custom-rules/      # Custom WAF rules
│   └── crs-rules/         # Shared CRS rules
├── log_processor/      # Real-time log parser
├── db/                 # MySQL initialization
└── docker-compose.yml  # Service orchestration
```

## Services

### Container Architecture
1. **nginx-waf**: ModSecurity + OWASP CRS (port 80)
   - Custom rules in `/nginx/custom-rules/`
   - CRS rules shared via `/nginx/crs-rules/`
2. **backend**: FastAPI API server
   - DDD architecture
   - JWT authentication
   - WebSocket support
3. **frontend**: React dashboard
   - Real-time updates
   - Interactive charts
4. **database**: MySQL 8.0
   - Dual-table architecture
   - Optimized indexes
5. **log-processor**: ModSecurity log parser
   - 0.5s polling interval
   - Real-time event processing

## API Documentation

### Core Endpoints

```http
# Authentication
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me

# Security Events
GET    /api/security-events
GET    /api/security-events/{id}
POST   /api/security-events/export
WS     /api/ws/security-events

# Dashboard
GET    /api/dashboard/stats
GET    /api/dashboard/recent-events

# CRS Rules
GET    /api/crs-rules/list
GET    /api/crs-rules/content?filename={file}
GET    /api/crs-rules/search?keyword={term}

# Attack Testing
GET    /api/vulnerable/xss
GET    /api/vulnerable/sqli
POST   /api/vulnerable/file-upload
```

**Interactive Docs**: 
- Swagger UI: `http://localhost/api/docs`
- ReDoc: `http://localhost/api/redoc`

## Management

```bash
# Service Control
./manage.sh start       # Start all services
./manage.sh stop        # Stop all services
./manage.sh restart     # Restart services
./manage.sh status      # Health check

# Development
./manage.sh dev         # React dev server
./manage.sh build       # Rebuild images
./manage.sh clean       # Remove everything

# Logs
./manage.sh logs        # All service logs
./manage.sh logs backend  # Specific service
```

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
npm run build  # Production build
```

### Backend Development
```bash
docker exec -it waf_backend bash
uv sync                # Install dependencies
uv run uvicorn main:app --reload
```

### Database Access
```bash
docker exec -it waf_database mysql -u waf_user -p
# Password: waf_pass123
```

## Configuration

### WAF Settings
```yaml
# docker-compose.yml
MODSEC_RULE_ENGINE: on       # Enable ModSecurity
PARANOIA: 1                  # CRS paranoia level (1-4)
MODSEC_AUDIT_LOG_FORMAT: JSON
```

### Environment Variables
```bash
# Backend
DB_HOST=database
DB_NAME=waf_test_db
SECRET_KEY=your-secret-key

# Frontend
VITE_API_BASE_URL=/api
```

## Attack Detection

### Anomaly Scoring
- Threshold: 5 points triggers blocking
- Each attack pattern adds to anomaly score
- Blocking evaluation rule: 949110

### Event Classification
- **Critical**: High score + blocked + multiple attacks
- **High**: Attack detected + blocked
- **Medium**: Attack detected, moderate score
- **Low**: Minor anomalies, unblocked

## Performance

- **Log Processing**: 0.5s polling interval
- **Database**: Composite indexes for queries
- **WebSocket**: HIGH severity events only
- **Cache**: 5-minute TTL for statistics
- **CSV Export**: Handles 100k+ events

## Troubleshooting

### Common Issues

**WAF Not Blocking**
- Check `PARANOIA` level in docker-compose.yml
- Verify `MODSEC_RULE_ENGINE=on`
- Monitor audit logs: `tail -f logs/modsecurity/audit.log`

**Missing Events**
- Check log-processor: `docker ps | grep log-processor`
- Review logs: `docker-compose logs log-processor`

**WebSocket Connection Failed**
- Ensure backend is running
- Check endpoint: `/api/ws/security-events`

**Database Connection Error**
- Verify MySQL container: `docker ps | grep database`
- Test connection: `docker exec -it waf_database mysql -u waf_user -p`

