-- Database initialization
CREATE DATABASE IF NOT EXISTS waf_test_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE waf_test_db;

-- Create user if not exists
CREATE USER IF NOT EXISTS 'waf_user'@'%' IDENTIFIED BY 'waf_pass123';
GRANT ALL PRIVILEGES ON waf_test_db.* TO 'waf_user'@'%';
FLUSH PRIVILEGES;

-- Set database configuration
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET GLOBAL max_connections = 500;
SET GLOBAL innodb_buffer_pool_size = 268435456; -- 256MB