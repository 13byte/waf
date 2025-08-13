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
- Real-time event tracking
- Attack pattern analysis
- Threat level indicators
- IP reputation tracking

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
- `WS /api/security-events/stream` - Real-time stream

### WAF Configuration
- `GET /api/waf/config` - Get configuration
- `PUT /api/waf/config` - Update settings
- `POST /api/waf/config/rules` - Add custom rules

### Attack Lab
- `POST /api/vulnerable/xss` - XSS test
- `POST /api/vulnerable/sqli` - SQL injection test
- `POST /api/vulnerable/lfi` - Path traversal test
- `POST /api/vulnerable/rce` - Command injection test

## Development

### Frontend Development
```bash
cd frontend
npm install
npm run dev  # Start dev server on port 5173
```

### Backend Development
```bash
cd backend
# Uses uv for dependency management
# Backend runs on port 8000 in Docker
```

### Database Access
```bash
# Connect to MySQL
docker exec -it waf_database mysql -u waf_user -p
# Password: waf_pass123
```

