USE waf_test_db;

CREATE TABLE waf_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_unique_id VARCHAR(255) NOT NULL UNIQUE,
    timestamp DATETIME NOT NULL,
    client_ip VARCHAR(50) NOT NULL,
    method VARCHAR(10) NOT NULL,
    uri VARCHAR(2048) NOT NULL,
    status_code INT NOT NULL,
    is_blocked BOOLEAN NOT NULL,
    attack_types JSON,
    rule_ids JSON,
    severity_score INT DEFAULT 0,
    raw_log JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_client_ip (client_ip),
    INDEX idx_attack_types ((CAST(attack_types AS CHAR(100) ARRAY))),
    INDEX idx_is_blocked (is_blocked)
);
