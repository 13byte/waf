INSERT INTO users (username, email, password_hash, role, bio) VALUES
('admin', 'admin@waftest.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6cDxGqF5Cq', 'ADMIN', 'System Administrator'),
('testuser1', 'user1@waftest.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6cDxGqF5Cq', 'USER', 'Regular test user'),
('testuser2', 'user2@waftest.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6cDxGqF5Cq', 'USER', 'Another test user'),
('moderator1', 'mod@waftest.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6cDxGqF5Cq', 'MODERATOR', 'Forum Moderator'),
('vulnuser', 'vuln@waftest.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6cDxGqF5Cq', 'USER', 'Test user for vulnerability testing');

INSERT INTO categories (name, description) VALUES
('General', 'General discussion topics'),
('Security', 'Security related discussions'),
('Technology', 'Technology news and updates'),
('Programming', 'Programming languages and development'),
('Testing', 'Software testing and QA'),
('Announcements', 'Important announcements'),
('Feedback', 'User feedback and suggestions'),
('Bug Reports', 'Bug reports and issues');

INSERT INTO posts (title, content, user_id, category_id, view_count) VALUES
('Welcome to WAF Test Board', 'This is a test environment for ModSecurity testing. Please use responsibly.', 1, 6, 150),
('Test Post for XSS', 'This post is designed for XSS testing. Content: <div>Normal content</div>', 2, 5, 75),
('SQL Injection Test Post', 'This post title contains: Regular content for SQL injection testing', 3, 5, 89),
('File Upload Guidelines', 'Please follow these guidelines when uploading files to the system.', 1, 1, 45),
('Security Best Practices', 'Here are some security best practices for web applications.', 4, 2, 120),
('Programming Tips', 'Useful programming tips and tricks for developers.', 2, 4, 95),
('Path Traversal Test', 'Content for path traversal testing: ../../../etc/passwd', 5, 5, 23);

INSERT INTO comments (content, post_id, user_id) VALUES
('Great introduction post!', 1, 2),
('Thanks for the guidelines.', 4, 3),
('Very helpful security tips.', 5, 2),
('Good programming advice.', 6, 4),
('Test comment for XSS: <script>alert("test")</script>', 2, 5),
('SQL test comment: \' OR 1=1--', 3, 5),
('File path test: ../../sensitive/file.txt', 4, 5);