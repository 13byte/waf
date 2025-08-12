-- Update waf_logs table to include source/destination and target website information
ALTER TABLE waf_logs 
    CHANGE COLUMN client_ip source_ip VARCHAR(50) NOT NULL,
    ADD COLUMN source_port INT DEFAULT NULL AFTER source_ip,
    ADD COLUMN dest_ip VARCHAR(50) DEFAULT NULL AFTER source_port,
    ADD COLUMN dest_port INT DEFAULT NULL AFTER dest_ip,
    ADD COLUMN target_website VARCHAR(255) DEFAULT NULL AFTER dest_port,
    ADD COLUMN is_attack BOOLEAN DEFAULT FALSE AFTER is_blocked,
    ADD COLUMN rule_files JSON DEFAULT NULL AFTER rule_ids,
    ADD COLUMN anomaly_score INT DEFAULT 0 AFTER severity_score;

-- Add indexes for better query performance
CREATE INDEX idx_source_ip ON waf_logs(source_ip);
CREATE INDEX idx_target_website ON waf_logs(target_website);