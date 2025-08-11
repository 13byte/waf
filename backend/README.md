# Backend

A FastAPI backend for the WAF Test Platform, built with a Domain-Driven Design (DDD) approach.

## Tech Stack
- FastAPI
- Python 3.12
- SQLAlchemy
- Pydantic
- JWT for Authentication

## Directory Structure

The backend is organized into a DDD-style architecture to separate concerns and improve maintainability.

```
backend/
├── main.py              # Application entry point
├── Dockerfile           # Docker configuration
└── app/
    ├── domain/          # Core business logic and entities
    │   ├── models/      # SQLAlchemy models and enums
    │   ├── repositories/ # Abstract repository interfaces
    │   └── services/     # Domain services (if any)
    │
    ├── application/     # Application layer services
    │   ├── services/    # Orchestrates business logic
    │   └── dtos/        # Data Transfer Objects (Pydantic schemas)
    │
    ├── infrastructure/  # Implementation of external concerns
    │   ├── repositories/ # SQLAlchemy repository implementations
    │   ├── auth/        # Authentication utilities (JWT, password hashing)
    │   ├── config.py    # Application settings
    │   └── database.py  # Database session management
    │
    └── presentation/    # API layer (FastAPI routers)
        ├── routers/     # API endpoints for each resource
        └── dependencies.py # FastAPI dependency injection setup
```

## API Endpoints

The API provides endpoints for authentication, post management, and vulnerability testing.

- **Authentication**: `/api/auth/{register, login, me}`
- **Posts**: `/api/posts/{...}`
- **Monitoring**: `/api/monitoring/{logs, stats}`
- **Vulnerability Tests**: `/api/vulnerable/{xss, sqli, ...}`

## How to Run

The backend is managed by the `docker-compose.yml` in the root directory. Use the `manage.sh` script to control the services.

```bash
# Start all services (including the backend)
./manage.sh start

# View backend-specific logs
./manage.sh logs backend
```
