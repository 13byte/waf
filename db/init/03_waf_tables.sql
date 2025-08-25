-- WAF specific tables
USE waf_test_db;

-- WAF logs table
CREATE TABLE IF NOT EXISTS waf_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    log_unique_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_ip VARCHAR(50),
    source_port INT,
    dest_ip VARCHAR(50),
    dest_port INT,
    target_website VARCHAR(255),
    method VARCHAR(10),
    uri TEXT,
    status_code INT,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_attack BOOLEAN DEFAULT FALSE,
    attack_types JSON,
    rule_ids JSON,
    rule_files JSON,
    severity_score INT DEFAULT 0,
    anomaly_score INT DEFAULT 0,
    raw_log JSON,
    INDEX idx_log_unique_id (log_unique_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_source_ip (source_ip),
    INDEX idx_is_blocked (is_blocked),
    INDEX idx_status_code (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp DATETIME NOT NULL,
    source_ip VARCHAR(50) NOT NULL,
    source_port INT,
    destination_ip VARCHAR(50),
    destination_port INT,
    method VARCHAR(10),
    uri TEXT,
    target_website VARCHAR(255),
    query_string TEXT,
    status_code INT,
    user_agent VARCHAR(1024),
    referer TEXT,
    request_headers JSON,
    request_body VARCHAR(4096),
    response_headers JSON,
    response_body VARCHAR(4096),
    matched_rules JSON,
    rules_matched JSON,
    rule_files JSON,
    anomaly_score INT DEFAULT 0,
    risk_score FLOAT DEFAULT 0.0,
    severity VARCHAR(20) DEFAULT 'low',
    attack_type VARCHAR(50),
    is_blocked BOOLEAN DEFAULT FALSE,
    is_attack BOOLEAN DEFAULT FALSE,
    geo_location JSON,
    country VARCHAR(50),
    city VARCHAR(100),
    response_time INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_id (event_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_source_ip (source_ip),
    INDEX idx_source_port (source_port),
    INDEX idx_target_website (target_website),
    INDEX idx_severity (severity),
    INDEX idx_attack_type (attack_type),
    INDEX idx_is_blocked (is_blocked),
    INDEX idx_is_attack (is_attack),
    INDEX idx_anomaly_score (anomaly_score),
    INDEX idx_timestamp_attack (timestamp, is_attack),
    INDEX idx_source_ip_timestamp (source_ip, timestamp),
    INDEX idx_attack_type_severity (attack_type, severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WAF configuration table
CREATE TABLE IF NOT EXISTS waf_config (
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
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_config_key (config_key),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WAF rules table
CREATE TABLE IF NOT EXISTS waf_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_id VARCHAR(50) UNIQUE NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    pattern TEXT,
    action ENUM('ALLOW', 'BLOCK', 'LOG') DEFAULT 'LOG',
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    category VARCHAR(50),
    tags JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rule_id (rule_id),
    INDEX idx_severity (severity),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IP blacklist/whitelist table
CREATE TABLE IF NOT EXISTS ip_lists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    list_type ENUM('BLACKLIST', 'WHITELIST') NOT NULL,
    reason TEXT,
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_ip_list (ip_address, list_type),
    INDEX idx_ip_address (ip_address),
    INDEX idx_list_type (list_type),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;