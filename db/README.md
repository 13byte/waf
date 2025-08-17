# WAF Security Operations Center - Database

MySQL 8.0 database schema and configuration for WAF security event storage and user management.

## Database Configuration

### Connection Settings
- **Host**: database (Docker service name)
- **Port**: 3306
- **Database**: waf_test_db
- **User**: waf_user
- **Password**: waf_pass123
- **Root Password**: root123

### Character Set
- **Default**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **Timezone**: Asia/Seoul (UTC+9)

## Schema Architecture

### Core Tables

#### users
User management with role-based access control.

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER', 'ADMIN', 'MODERATOR') DEFAULT 'USER',
    profile_image VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### security_events
Primary table for security event storage with enhanced attack classification.

```sql
CREATE TABLE security_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(50) UNIQUE NOT NULL,
    timestamp DATETIME NOT NULL,
    source_ip VARCHAR(45) NOT NULL,
    source_port INTEGER,
    destination_ip VARCHAR(45),
    destination_port INTEGER,
    target_website VARCHAR(255),
    uri TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    user_agent TEXT,
    attack_type VARCHAR(50),
    severity VARCHAR(20) NOT NULL,
    is_attack BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    risk_score FLOAT DEFAULT 0.0,
    anomaly_score INTEGER DEFAULT 0,
    rules_matched JSON,
    rule_files JSON,
    request_headers JSON,
    request_body TEXT,
    response_headers JSON,
    response_body TEXT,
    geo_location JSON
);
```

#### waf_logs
Legacy compatibility table for raw ModSecurity audit logs.

```sql
CREATE TABLE waf_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    log_unique_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp DATETIME NOT NULL,
    source_ip VARCHAR(50) NOT NULL,
    source_port INTEGER,
    dest_ip VARCHAR(50),
    dest_port INTEGER,
    target_website VARCHAR(255),
    method VARCHAR(10) NOT NULL,
    uri VARCHAR(2048) NOT NULL,
    status_code INTEGER NOT NULL,
    is_blocked BOOLEAN NOT NULL,
    is_attack BOOLEAN DEFAULT FALSE,
    attack_types JSON,
    rule_ids JSON,
    rule_files JSON,
    severity_score INTEGER DEFAULT 0,
    anomaly_score INTEGER DEFAULT 0,
    raw_log JSON
);
```

#### waf_config
WAF configuration and custom rules storage.

```sql
CREATE TABLE waf_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### Supporting Tables

#### user_sessions
User session tracking for security auditing.

```sql
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### audit_logs
System audit trail for administrative actions.

```sql
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

## Performance Indexes

### Security Events Optimization
```sql
-- Primary query patterns
CREATE INDEX idx_security_events_timestamp_attack 
ON security_events(timestamp DESC, is_attack, is_blocked);

CREATE INDEX idx_security_events_source_ip_timestamp 
ON security_events(source_ip, timestamp DESC);

CREATE INDEX idx_security_events_attack_type_timestamp 
ON security_events(attack_type, timestamp DESC);

-- Dashboard queries
CREATE INDEX idx_security_events_dashboard 
ON security_events(timestamp DESC, is_blocked, severity);

-- Analytics queries
CREATE INDEX idx_security_events_analytics 
ON security_events(timestamp DESC, attack_type, severity, is_blocked);
```

### WAF Logs Compatibility
```sql
CREATE INDEX idx_waf_logs_timestamp_blocked
ON waf_logs(timestamp DESC, blocked);

CREATE INDEX idx_waf_logs_source_ip_timestamp
ON waf_logs(source_ip, timestamp DESC);
```

### User Management
```sql
CREATE INDEX idx_users_login 
ON users(username, email);

CREATE INDEX idx_user_sessions_user_expires
ON user_sessions(user_id, expires_at);
```

## Data Types and Constraints

### String Lengths
- **IP Addresses**: VARCHAR(45) for IPv6 support
- **URLs**: TEXT for long URIs
- **User Agent**: TEXT for full browser strings
- **Event IDs**: VARCHAR(50) for UUID storage

### JSON Columns
- **rules_matched**: Array of matched rule IDs
- **rule_files**: Array of rule file names
- **request_headers**: Key-value header pairs
- **response_headers**: Key-value header pairs
- **geo_location**: IP geolocation data

### Enum Values
- **User Roles**: USER, ADMIN, MODERATOR
- **Severity Levels**: low, medium, high, critical
- **HTTP Methods**: GET, POST, PUT, DELETE, etc.

## Initialization Scripts

### 01_database_init.sql
Database and user creation with global configuration.

```sql
CREATE DATABASE IF NOT EXISTS waf_test_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'waf_user'@'%' IDENTIFIED BY 'waf_pass123';
GRANT ALL PRIVILEGES ON waf_test_db.* TO 'waf_user'@'%';
```

### 02_core_tables.sql
Core user management and audit tables.

### 03_waf_tables.sql
WAF-specific tables for security events and configuration.

### 04_performance_indexes.sql
Performance optimization indexes for common query patterns.

### 05_initial_admin.sql
Default admin user creation for initial system access.

```sql
INSERT INTO users (username, email, password_hash, role, bio) VALUES
('admin', 'admin@waftest.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6cDxGqF5Cq', 'ADMIN', 'System Administrator');
```

## Database Access

### Connection via Docker
```bash
# Connect to MySQL container
docker exec -it waf_database mysql -u waf_user -p
# Password: waf_pass123

# Connect as root
docker exec -it waf_database mysql -u root -p
# Password: root123
```

### Common Queries

#### Recent Security Events
```sql
SELECT event_id, timestamp, source_ip, attack_type, severity, is_blocked
FROM security_events
WHERE timestamp >= NOW() - INTERVAL 1 HOUR
ORDER BY timestamp DESC
LIMIT 20;
```

#### Attack Statistics
```sql
SELECT 
    attack_type,
    COUNT(*) as total_attacks,
    SUM(CASE WHEN is_blocked THEN 1 ELSE 0 END) as blocked_attacks,
    AVG(anomaly_score) as avg_anomaly_score
FROM security_events
WHERE is_attack = TRUE 
    AND timestamp >= CURDATE()
GROUP BY attack_type
ORDER BY total_attacks DESC;
```

#### Top Attacking IPs
```sql
SELECT 
    source_ip,
    COUNT(*) as total_requests,
    SUM(CASE WHEN is_attack THEN 1 ELSE 0 END) as attack_requests,
    SUM(CASE WHEN is_blocked THEN 1 ELSE 0 END) as blocked_requests
FROM security_events
WHERE timestamp >= NOW() - INTERVAL 24 HOUR
GROUP BY source_ip
HAVING attack_requests > 0
ORDER BY attack_requests DESC
LIMIT 10;
```

## Backup and Recovery

### Database Backup
```bash
# Full database backup
docker exec waf_database mysqldump -u root -p waf_test_db > backup.sql

# Table-specific backup
docker exec waf_database mysqldump -u root -p waf_test_db security_events > security_events_backup.sql
```

### Database Restore
```bash
# Restore from backup
docker exec -i waf_database mysql -u root -p waf_test_db < backup.sql
```

## Maintenance

### Regular Maintenance Tasks

#### Clean Old Events
```sql
-- Delete events older than 90 days
DELETE FROM security_events 
WHERE timestamp < NOW() - INTERVAL 90 DAY;

-- Delete old audit logs
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL 180 DAY;
```

#### Optimize Tables
```sql
OPTIMIZE TABLE security_events;
OPTIMIZE TABLE waf_logs;
ANALYZE TABLE security_events;
```

### Monitor Database Size
```sql
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'waf_test_db'
ORDER BY size_mb DESC;
```

## Configuration Files

### my.cnf
MySQL server configuration optimized for WAF workload.

```ini
[mysqld]
bind-address = 0.0.0.0
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+09:00'
max_connections = 200
innodb_buffer_pool_size = 128M
slow-query-log = 1
long_query_time = 2
```

### Environment Variables
Docker Compose configuration for database service.

```yaml
environment:
  MYSQL_ROOT_PASSWORD: root123
  MYSQL_DATABASE: waf_test_db
  MYSQL_USER: waf_user
  MYSQL_PASSWORD: waf_pass123
  TZ: Asia/Seoul
```

## Troubleshooting

### Connection Issues
1. Verify container is running: `docker ps | grep database`
2. Check port mapping: `docker port waf_database`
3. Test connection: `docker exec -it waf_database mysql -u waf_user -p`

### Performance Issues
1. Check slow query log: `docker exec waf_database cat /var/lib/mysql/slow.log`
2. Analyze query performance: `EXPLAIN SELECT ...`
3. Monitor index usage: `SHOW INDEX FROM security_events`

### Storage Issues
1. Check disk usage: `docker system df`
2. Monitor table sizes: `SELECT table_name, data_length FROM information_schema.tables`
3. Clean old data: Run maintenance queries above

## Security Considerations

### Access Control
- Limited user privileges (waf_user cannot create databases)
- Network access restricted to Docker network
- Password authentication required

### Data Protection
- UTF8MB4 encoding prevents character set attacks
- Proper data types prevent overflow attacks
- Foreign key constraints maintain referential integrity

### Audit Trail
- All administrative actions logged in audit_logs table
- User session tracking for security monitoring
- Timestamp tracking for all data modifications