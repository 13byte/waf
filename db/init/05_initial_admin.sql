-- Create initial admin user only
USE waf_test_db;

-- Insert admin user with hashed password (admin123)
INSERT INTO users (username, email, password_hash, role, bio) VALUES
('admin', 'admin@waftest.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6cDxGqF5Cq', 'ADMIN', 'System Administrator')
ON DUPLICATE KEY UPDATE 
    password_hash = VALUES(password_hash),
    role = VALUES(role);