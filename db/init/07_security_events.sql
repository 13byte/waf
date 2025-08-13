-- Create security events table for new architecture
CREATE TABLE IF NOT EXISTS security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp DATETIME NOT NULL,
    
    -- Network info
    source_ip VARCHAR(50) NOT NULL,
    source_port INT,
    destination_ip VARCHAR(50),
    destination_port INT,
    
    -- Request details
    target_website VARCHAR(255),
    uri TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    user_agent TEXT,
    
    -- Attack classification
    attack_type VARCHAR(50),
    severity VARCHAR(20),
    is_attack BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN NOT NULL,
    
    -- Risk assessment
    risk_score FLOAT DEFAULT 0.0,
    anomaly_score INT DEFAULT 0,
    
    -- WAF details
    rules_matched JSON,
    rule_files JSON,
    
    -- Headers and body
    request_headers JSON,
    request_body TEXT,
    response_headers JSON,
    response_body TEXT,
    
    -- Geo location
    geo_location JSON,
    
    -- Indexes for performance
    INDEX idx_event_id (event_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_source_ip (source_ip),
    INDEX idx_attack_type (attack_type),
    INDEX idx_severity (severity),
    INDEX idx_is_attack (is_attack),
    INDEX idx_is_blocked (is_blocked),
    INDEX idx_timestamp_attack (timestamp, is_attack),
    INDEX idx_source_ip_timestamp (source_ip, timestamp),
    INDEX idx_attack_type_severity (attack_type, severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create WAF configuration tables
CREATE TABLE IF NOT EXISTS waf_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_name VARCHAR(100) UNIQUE NOT NULL,
    paranoia_level INT DEFAULT 1 CHECK (paranoia_level BETWEEN 1 AND 4),
    rule_engine BOOLEAN DEFAULT TRUE,
    audit_engine BOOLEAN DEFAULT TRUE,
    anomaly_threshold INT DEFAULT 5,
    blocked_ips JSON,
    allowed_ips JSON,
    custom_rules JSON,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    INDEX idx_config_name (config_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create custom rules table
CREATE TABLE IF NOT EXISTS custom_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    pattern TEXT NOT NULL,
    action ENUM('block', 'allow', 'log', 'redirect') NOT NULL,
    priority INT DEFAULT 100,
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    INDEX idx_priority (priority),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default WAF config
INSERT INTO waf_configs (config_name, paranoia_level, rule_engine, audit_engine, anomaly_threshold, updated_by)
VALUES ('default', 1, TRUE, TRUE, 5, 'system')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Add role column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'viewer';

-- Update existing admin user
UPDATE users SET role = 'admin' WHERE username = 'admin';