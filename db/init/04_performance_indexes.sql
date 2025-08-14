-- Performance optimization indexes
USE waf_test_db;

-- Security events performance indexes
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp_attack 
ON security_events(timestamp DESC, is_attack, is_blocked);

CREATE INDEX IF NOT EXISTS idx_security_events_source_ip_timestamp 
ON security_events(source_ip, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_attack_type_timestamp 
ON security_events(attack_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_severity_timestamp 
ON security_events(severity, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_anomaly_score 
ON security_events(anomaly_score DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_dashboard 
ON security_events(timestamp DESC, is_blocked, severity);

CREATE INDEX IF NOT EXISTS idx_security_events_uri 
ON security_events(uri(255));

CREATE INDEX IF NOT EXISTS idx_security_events_method 
ON security_events(method);

CREATE INDEX IF NOT EXISTS idx_security_events_analytics 
ON security_events(timestamp DESC, attack_type, severity, is_blocked);

CREATE INDEX IF NOT EXISTS idx_security_events_status_code 
ON security_events(status_code);

-- WAF logs performance indexes
CREATE INDEX IF NOT EXISTS idx_waf_logs_timestamp_blocked
ON waf_logs(timestamp DESC, blocked);

CREATE INDEX IF NOT EXISTS idx_waf_logs_source_ip_timestamp
ON waf_logs(source_ip, timestamp DESC);

-- Users performance indexes
CREATE INDEX IF NOT EXISTS idx_users_login 
ON users(username, email);

-- Analyze tables for query optimization
ANALYZE TABLE security_events;
ANALYZE TABLE waf_logs;
ANALYZE TABLE users;