GRANT ALL PRIVILEGES ON waf_test_db.* TO 'waf_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON waf_test_db.* TO 'waf_user'@'%';
FLUSH PRIVILEGES;

CREATE USER IF NOT EXISTS 'readonly_user'@'%' IDENTIFIED BY 'readonly123';
GRANT SELECT ON waf_test_db.* TO 'readonly_user'@'%';

CREATE INDEX idx_posts_search ON posts(title, content(100));
CREATE INDEX idx_users_login ON users(username, email);
CREATE INDEX idx_comments_thread ON comments(post_id, parent_id, created_at);

SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

UPDATE posts SET view_count = FLOOR(RAND() * 200) + 1;
UPDATE comments SET like_count = FLOOR(RAND() * 50);

INSERT INTO audit_logs (action, table_name, record_id, ip_address, user_agent) VALUES
('CREATE', 'users', 1, '192.168.1.100', 'Mozilla/5.0 (Test Browser)'),
('CREATE', 'posts', 1, '192.168.1.101', 'Mozilla/5.0 (Test Browser)'),
('CREATE', 'comments', 1, '192.168.1.102', 'Mozilla/5.0 (Test Browser)');