# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WAF Security Operations Center - A real-time web application firewall monitoring and attack testing platform built with Docker containers for ModSecurity/OWASP CRS, FastAPI backend, React frontend, and MySQL database.

## Recent Updates

### CRS Rules Viewer (August 2025)
- Added CRS (Core Rule Set) rules viewer in dashboard
- Real-time rule statistics: 681 total rules, 307 critical/error rules  
- Search functionality across all CRS rule files
- Detailed rule inspection with parsed and raw data views
- Shared volume approach for accessing nginx container rules
- API endpoint changed to query parameters to avoid ModSecurity false positives

## Common Development Commands

### Service Management
```bash
# Start all services
./manage.sh start

# Stop all services  
./manage.sh stop

# Restart services
./manage.sh restart

# Check service health status
./manage.sh status

# View logs (all services or specific)
./manage.sh logs
./manage.sh logs backend
./manage.sh logs frontend
./manage.sh logs nginx-waf
./manage.sh logs database
./manage.sh logs log-processor

# Development mode (with React dev server)
./manage.sh dev

# Rebuild Docker images
./manage.sh build

# Clean up everything (containers, volumes, images)
./manage.sh clean
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run TypeScript compiler check
tsc -b

# Analyze bundle size
npm run analyze

# Preview production build
npm run preview
```

### Backend Development
```bash
# Access backend container
docker exec -it waf_backend bash

# Once inside container:
# Install dependencies with uv
uv sync

# Run development server with auto-reload
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Install additional packages
uv add <package-name>

# Run tests (if available)
uv run pytest
```

### Database Access
```bash
# Connect to MySQL database
docker exec -it waf_database mysql -u waf_user -p
# Password: waf_pass123
# Database: waf_test_db

# View database logs
docker-compose logs -f database
```

### Log Monitoring
```bash
# Monitor ModSecurity audit logs
tail -f logs/modsecurity/audit.log

# Monitor Nginx access/error logs
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log

# Monitor backend service logs
docker-compose logs -f backend

# Monitor log processor
docker-compose logs -f log-processor
```

## Architecture Overview

### Domain-Driven Design Structure

The project follows a DDD architecture with clear separation of concerns:

**Backend (`/backend/app/`):**
- **domain/**: Core business logic, models (SecurityEvent, User, WafConfig), repository interfaces, and domain services (SecurityAnalysisService)
- **application/**: Application services and DTOs that orchestrate domain logic
- **infrastructure/**: External concerns - database, auth, cache, concrete repository implementations 
- **presentation/**: API layer with FastAPI routers and dependency injection

**Frontend (`/frontend/src/`):**
- **domain/**: Business entities, value objects, repository interfaces, and domain services
- **application/**: Use cases that coordinate domain logic (GetDashboardData, UpdateWafConfig, etc.)
- **infrastructure/**: API client and concrete repository implementations
- **presentation/**: React components, pages, and layouts

### Service Architecture

**Container Services:**
1. **nginx-waf**: ModSecurity + OWASP CRS 4.17.1 WAF entry point (port 80)
   - Custom rules support in `/nginx/custom-rules/`
   - CRS rules accessible via shared volume `/nginx/crs-rules/`
2. **backend**: FastAPI 0.116.1 API server with WebSocket support
   - Python 3.12 with uv package manager
   - DDD architecture with clear separation of concerns
3. **frontend**: React 18 + TypeScript dashboard
   - Vite build system for fast development
   - TailwindCSS for styling
4. **database**: MySQL 8.0 with optimized indexes and dual-table architecture
5. **log-processor**: Real-time ModSecurity log parser feeding events to database

**Data Flow:**
1. HTTP traffic → Nginx/ModSecurity → Backend API
2. ModSecurity logs → Log Processor → MySQL database
3. Frontend → API calls → Backend → Database
4. Real-time events: Backend WebSocket → Frontend dashboard

### Key Technical Details

**Authentication:**
- JWT tokens with 30-minute expiration
- BCrypt password hashing
- Role-based access control (USER, ADMIN roles)
- Google OAuth integration support

**Security Event Processing:**
- Dual table approach: `security_events` (new architecture) + `waf_logs` (legacy compatibility)
- Attack classification with anomaly scoring (threshold: 5)
- Risk score calculation based on attack type, severity, and blocking status
- Real-time WebSocket streaming for HIGH severity or blocked events

**WAF Configuration:**
- OWASP CRS with configurable paranoia levels (1-4, default: 1)
- Custom rule support in `/nginx/custom_rules/`
- JSON audit log format for efficient parsing
- Blocking evaluation rule (949110) for attack decisions

**Performance Optimizations:**
- Composite database indexes for common query patterns
- 5-minute TTL cache for dashboard statistics
- Connection pooling with 300s recycle time
- 0.5s polling interval for log processing

## API Endpoints

**Core Endpoints:**
- `/api/auth/*` - Authentication (login, register, current user)
- `/api/security-events/*` - Event listing, details, filtering, CSV export
- `/api/dashboard/*` - Statistics, recent events, threat analysis
- `/api/analytics/*` - Aggregated stats, period comparison, drill-down data
- `/api/vulnerable/*` - Attack testing lab (XSS, SQLi, path traversal, etc.)
- `/api/crs-rules/*` - CRS rule viewer (list, content, search)
- `/api/ws/security-events` - WebSocket for real-time event streaming

**API Documentation:**
- Swagger UI: `http://localhost/api/docs`
- ReDoc: `http://localhost/api/redoc`

## Environment Configuration

Key environment variables are configured in `docker-compose.yml`:

**Backend:**
- `DB_HOST=database`
- `DB_NAME=waf_test_db`  
- `DB_USER=waf_user`
- `DB_PASSWORD=waf_pass123`
- `SECRET_KEY` - JWT signing key
- `GOOGLE_CLIENT_ID` - Optional Google OAuth

**Frontend:**
- `VITE_API_BASE_URL=/api`
- `VITE_GOOGLE_CLIENT_ID` - Optional Google OAuth

**WAF:**
- `MODSEC_RULE_ENGINE=on` - Enable/disable ModSecurity
- `PARANOIA=1` - CRS paranoia level (1-4)
- `MODSEC_AUDIT_LOG_FORMAT=JSON` - Audit log format

## Default Credentials

- Web Dashboard: `admin` / `admin123`
- MySQL Database: `waf_user` / `waf_pass123`

## Development Guidelines

### Code Style
- Use TypeScript for type safety in frontend
- Follow React hooks best practices
- Keep components simple and focused
- Use English for all code comments and documentation
- Avoid unnecessary comments - code should be self-documenting
- Use meaningful variable and function names

### Docker Development
- Build commands are handled by `manage.sh` script
- Use `docker-compose build --no-cache` for clean rebuilds
- Frontend changes require rebuild for production container
- Backend uses auto-reload in development mode

### Security Considerations
- Never commit secrets or API keys
- Validate all user inputs
- Use parameterized queries for database operations
- Keep ModSecurity rules up to date
- Monitor WAF logs for false positives
- nginx + modsecurity + crs 테스트를 진행할건데, XSS, SQL Injection, Path Traversal, Command Injection, User-Agnet 우회, Header 조작 공격 테스트를 할거야

프론트엔드는 React 백엔드는 fastapi version 0.116.1, python 3.12.x db는 mysql로 해서 구현을 했어. nginx + modsecurity + crs는 owasp/modsecurity-crs:nginx 이미지를 사용했어 로그 파싱 후 대쉬보드를 위해서 로그 프로세서도 따로 만들었어.

경로는 /Volumes/jeosongVault/jeosong/waf 여기에 들어가면 있어.

추가로 도커 빌드 재시작 이런건 내가 할게, 앞으로 mcp tools는 매우 적극적으로 모든 채팅에서 활용하고 코딩 할 떄는 항상 context7 먼저 사용해서 최신 문법을 익히고 코드 작성.  그리고 모든 문서 및 주석은 영어로 작성해주고 일상생활에서 쓰는 단어와 표현이 과장돼지 않는 단어, 간결하고 심플하게 작성

모든 대답은 한국말로, 모든 코드를 학습해봐