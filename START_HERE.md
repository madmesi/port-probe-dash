# Quick Start Guide

## Initial Setup & Database Initialization

If you're running this project for the first time or experiencing blank pages/errors, follow these steps:

### 1. Clean Start (Recommended for first run)

```bash
# Stop any running containers and remove volumes
docker compose down -v

# Rebuild and start all services
docker compose up --build
```

This ensures:
- PostgreSQL database is created fresh
- All migrations run in correct order (01_init.sql → 02_api_keys.sql → 03_ssl_certificates.sql)
- Admin user is created automatically
- Backend and frontend are properly connected

### 2. Default Admin Credentials

After startup, login with:
- **Username:** mohammad
- **Email:** email
- **Password:** VASLPass@123456

**⚠️ Change these credentials immediately after first login!**

### 3. Customize Admin User (Optional)

To use different admin credentials, edit `docker-compose.yml` lines 64-66 **BEFORE** first startup:

```yaml
ADMIN_USERNAME: your_username
ADMIN_EMAIL: your_email@example.com
ADMIN_PASSWORD: your_secure_password
```

### 4. Access the Application

Once running:
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:8080
- **Database:** localhost:5432 (for direct access)

### 5. Troubleshooting

**Blank page after login?**
```bash
docker compose down -v
docker compose up --build
```

**Backend errors?**
```bash
# Check backend logs
docker logs cmdb-backend

# Check if migrations ran
docker exec -it cmdb-postgres psql -U cmdb_user -d cmdb -c "\dt"
```

**Need to reset everything?**
```bash
docker compose down -v
rm -rf postgres_data  # If volume persists
docker compose up --build
```

## Architecture

- **Frontend (port 3001):** React + Vite + Tailwind
- **Backend (port 8080):** Go + Gorilla Mux
- **Database (port 5432):** PostgreSQL 16
- **Networking:** All services connected via Docker bridge network

## Database Migrations

Migrations run automatically on PostgreSQL first start:
1. `01_init.sql` - Core tables (users, servers, groups, permissions)
2. `02_api_keys.sql` - API key management
3. `03_ssl_certificates.sql` - SSL certificate tracking

If migrations fail, check:
```bash
docker logs cmdb-postgres
```

## Next Steps

1. Login with admin credentials
2. Create server groups (optional)
3. Add servers manually or via network data upload
4. Configure SSL certificates (optional)
5. Create additional users and assign permissions
