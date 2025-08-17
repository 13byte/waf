-- Performance optimization indexes
USE waf_test_db;

-- Security events performance indexes (additional to those in table definition)
CREATE INDEX idx_security_events_dashboard 
ON security_events(timestamp DESC, is_blocked, severity);

CREATE INDEX idx_security_events_uri 
ON security_events(uri(255));

CREATE INDEX idx_security_events_method 
ON security_events(method);

CREATE INDEX idx_security_events_analytics 
ON security_events(timestamp DESC, attack_type, severity, is_blocked);

CREATE INDEX idx_security_events_status_code 
ON security_events(status_code);

-- WAF logs performance indexes
CREATE INDEX idx_waf_logs_timestamp_blocked
ON waf_logs(timestamp DESC, blocked);

CREATE INDEX idx_waf_logs_source_ip_timestamp
ON waf_logs(source_ip, timestamp DESC);

-- Users performance indexes
CREATE INDEX idx_users_login 
ON users(username, email);

-- Analyze tables for query optimization
ANALYZE TABLE security_events;
ANALYZE TABLE waf_logs;
ANALYZE TABLE users;