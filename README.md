# CMDB Dashboard - Full Docker Setup

A comprehensive Configuration Management Database (CMDB) dashboard with React frontend, Go backend, and PostgreSQL database - all running in Docker containers.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS (Port 3000)
- **Backend**: Go REST API + WebSocket for SSH (Port 8080)
- **Database**: PostgreSQL 16 (Port 5432)

## Quick Start

### Start all services:
```bash
docker-compose up -d
```

### Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api

### First Time Setup

1. Sign up at http://localhost:3000/auth
2. Make yourself admin:
```bash
docker exec -it cmdb-postgres psql -U cmdb_user -d cmdb
UPDATE users SET approved = true WHERE email = 'your@email.com';
INSERT INTO user_roles (id, user_id, role) 
  SELECT gen_random_uuid(), id, 'admin' FROM users WHERE email = 'your@email.com';
\q
```

## Configuration

Edit `docker-compose.yml` to customize database credentials and ports.

## Features

✅ User authentication & authorization
✅ Role-based access control
✅ Server management
✅ Server grouping
✅ User management
✅ SSH terminal access
✅ Fully containerized

Ready to run with `docker-compose up -d`!
