# WAF Test Platform

A test platform for web application firewalls using the OWASP ModSecurity Core Rule Set (CRS).

## Architecture

The platform consists of five main services managed by Docker Compose:

- **nginx-waf**: The entry point, proxying requests to the frontend and backend. It integrates ModSecurity with the OWASP CRS to inspect traffic.
- **frontend**: A React-based single-page application that provides the user interface.
- **backend**: A FastAPI application that serves the API, including intentionally vulnerable endpoints for testing. It follows a Domain-Driven Design (DDD) structure.
- **database**: A MySQL database for storing application data, including users, posts, and parsed WAF logs.
- **log-processor**: A background service that watches the ModSecurity audit log, parses new entries, and stores them in the database.

```
                                   +-----------------+
                                   |  Log Processor  |
                                   +-------+---------+
                                           | Parses & Stores
                                           |
+-------------+      +-----------+      +--+------+      +----------+
| nginx-waf   |<---->| frontend  |<---->| backend |<---->| database |
| (port 80)   |      | (React)   |      | (FastAPI) |      | (MySQL)  |
+-------------+      +-----------+      +-----------+      +----------+
      ^
      |
+-----+----------------+
| ModSecurity Audit Log|
+----------------------+
```

## Tech Stack

- **WAF**: OWASP ModSecurity CRS (on nginx)
- **Frontend**: React 18, TypeScript, TailwindCSS, Vite
- **Backend**: FastAPI, Python 3.12, SQLAlchemy, DDD
- **Database**: MySQL 8.0
- **Log Processing**: Watchdog
- **Containerization**: Docker, Docker Compose

## Vulnerability Tests

The platform includes endpoints to test the WAF's effectiveness against common vulnerabilities:
- Cross-Site Scripting (XSS)
- SQL Injection (SQLi)
- Path Traversal
- Command Injection
- User-Agent Manipulation
- Header Manipulation

## Quick Start

1.  **Start all services:**
    ```bash
    chmod +x manage.sh
    ./manage.sh start
    ```

2.  **Check service status:**
    ```bash
    ./manage.sh status
    ```

3.  **Access URLs:**
    - **Frontend**: `http://localhost`
    - **API**: `http://localhost/api/`
    - **Health Check**: `http://localhost/health`

4.  **Monitor Logs:**
    ```bash
    # View all logs
    ./manage.sh logs

    # View specific service logs
    ./manage.sh logs nginx-waf
    ./manage.sh logs backend
    ./manage.sh logs log-processor
    ```

## Management Commands

The `manage.sh` script provides commands for controlling the environment:

- `start`: Start all services.
- `stop`: Stop all services.
- `restart`: Restart all services.
- `status`: Check the status of all services.
- `logs`: Tail the logs of all or a specific service.
- `build`: Rebuild all service images.
- `clean`: Stop and remove all containers, volumes, and networks.

