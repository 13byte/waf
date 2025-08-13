# WAF Security Operations Center

A web application firewall monitoring and management platform.

## What It Does

Monitor and manage your WAF in real-time. Track security events, analyze attack patterns, and configure protection rules.

## Services

- **nginx-waf**: Entry point with ModSecurity (port 80)
- **frontend**: React dashboard for monitoring
- **backend**: FastAPI for data and configuration
- **database**: MySQL for storing events
- **log-processor**: Parses WAF logs into events

## Tech Stack

- **WAF**: ModSecurity with OWASP CRS 4.17.1
- **Frontend**: React 18, TypeScript, TailwindCSS
- **Backend**: FastAPI 0.116.1, Python 3.12
- **Database**: MySQL 8.0
- **Architecture**: Domain-Driven Design (DDD)

## Features

### Security Monitoring
- Real-time event tracking via WebSocket
- Attack pattern analysis with rule-based detection
- Threat level indicators with anomaly scoring
- IP and port tracking
- Event details with raw JSON logs
- Exportable CSV reports

### WAF Management
- Configure protection rules
- Manage IP block lists
- Set paranoia levels
- Custom rule creation

### Attack Testing Lab
- Test XSS attacks
- Test SQL injection
- Test path traversal
- Test command injection
- Test XXE injection
- Test SSTI attacks
- Test header manipulation
- Test authentication bypass

## Quick Start

1. **Start services:**
   ```bash
   chmod +x manage.sh
   ./manage.sh start
   ```

2. **Check status:**
   ```bash
   ./manage.sh status
   ```

3. **Access the platform:**
   - Dashboard: `http://localhost`
   - API Docs: `http://localhost/api/docs`

4. **Default login:**
   - Username: `admin`
   - Password: `admin123`

## Commands

Use `./manage.sh` to control services:

- `start` - Start all services
- `stop` - Stop all services
- `restart` - Restart services
- `status` - Check service health
- `logs [service]` - View logs
- `build` - Rebuild images
- `clean` - Remove everything
- `dev` - Start development mode

## Project Structure

```
waf/
├── frontend/           # React dashboard
│   ├── src/
│   │   ├── domain/     # Business logic
│   │   ├── application/# Use cases
│   │   ├── infrastructure/# API client
│   │   └── presentation/# UI components
│   └── package.json
├── backend/            # FastAPI server
│   ├── app/
│   │   ├── domain/     # Models and services
│   │   ├── application/# Business logic
│   │   ├── infrastructure/# Database
│   │   └── presentation/# API routes
│   └── pyproject.toml
├── log_processor/      # Log parsing service
├── nginx/              # WAF configuration
├── db/                 # Database setup
└── docker-compose.yml
```

## API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Get statistics
- `GET /api/dashboard/recent-events` - Recent events
- `GET /api/dashboard/attack-patterns` - Attack analysis

### Security Events
- `GET /api/security-events` - List events with filters
- `GET /api/security-events/{id}` - Event details
- `WS /api/ws/security-events` - Real-time WebSocket stream

### WAF Configuration
- `GET /api/waf/config` - Get configuration
- `PUT /api/waf/config` - Update settings
- `POST /api/waf/config/rules` - Add custom rules

### Attack Lab
- `GET /api/vulnerable/xss` - XSS test
- `GET /api/vulnerable/sqli` - SQL injection test
- `GET /api/vulnerable/path-traversal` - Path traversal test
- `GET /api/vulnerable/command-injection` - Command injection test
- `POST /api/vulnerable/xxe` - XXE injection test
- `GET /api/vulnerable/ssti` - Template injection test
- `GET /api/vulnerable/header-manipulation` - Header manipulation test
- `POST /api/vulnerable/auth-bypass` - Authentication bypass test

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev     # Start dev server on port 5173
npm run build   # Build for production
npm run lint    # Run linter
```

### Backend Development
```bash
cd backend
# Uses uv for dependency management
# Backend runs on port 8000 in Docker
docker exec -it waf_backend bash  # Access backend container
```

### Database Access
```bash
# Connect to MySQL
docker exec -it waf_database mysql -u waf_user -p
# Password: waf_pass123

# Database name: waf_test_db
# Root password: root123
```

### View Logs
```bash
# ModSecurity audit logs
tail -f logs/modsecurity/audit.log

# Container logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f log-processor
```

## Troubleshooting

### Common Issues

1. **Login issues after page refresh**
   - Token and user info are stored in localStorage
   - Check browser console for errors
   - Clear localStorage if needed: `localStorage.clear()`

2. **WAF not blocking attacks**
   - Check paranoia level (default: 1)
   - Verify ModSecurity is enabled: `MODSEC_RULE_ENGINE=on`
   - Check audit logs: `tail -f logs/modsecurity/audit.log`

3. **Missing security events**
   - Verify log-processor is running: `docker ps | grep log-processor`
   - Check database connection
   - Review processor logs: `docker-compose logs log-processor`

4. **WebSocket connection failed**
   - Ensure backend is running
   - Check nginx proxy configuration
   - Verify `/api/ws/security-events` endpoint

5. **Database connection errors**
   - Confirm MySQL is running: `docker ps | grep database`
   - Check credentials in docker-compose.yml
   - Verify database exists: `waf_test_db`

## Security Notes

- WAF uses OWASP CRS with configurable paranoia levels
- All traffic passes through ModSecurity before reaching the application
- Attack detection is based on rule files, not just status codes
- Custom rules can be added following naming patterns like `CUSTOM-XXX-ATTACK-*`
- Anomaly scoring determines if requests are blocked (default threshold: 5)

