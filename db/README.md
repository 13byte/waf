# Database

This directory contains the configuration and initialization scripts for the MySQL database.

## Schema

The database, `waf_test_db`, contains the following tables:

- **users**: Stores user accounts and profile information.
- **categories**: Defines categories for posts.
- **posts**: Stores the content of posts, linked to users and categories.
- **comments**: Stores comments on posts.
- **waf_logs**: Stores parsed ModSecurity audit logs, populated by the `log-processor` service.

## Initialization

The database is automatically initialized when the Docker container starts for the first time. The SQL scripts in the `init/` directory are executed in order to:

1.  Create the database schema.
2.  Create the tables (`users`, `posts`, etc.).
3.  Insert initial seed data (e.g., default user accounts, categories).
4.  Apply any additional configuration.
5.  Create the `waf_logs` table for storing parsed security logs.

## Connection Details

- **Service Name**: `database` (within the Docker network)
- **Database**: `waf_test_db`
- **User**: `waf_user`
- **Password**: `waf_pass123` (defined in `docker-compose.yml`)
