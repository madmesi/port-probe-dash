# Port Probe Dashboard - Setup Instructions

## Overview
This document contains all the commands and changes made to set up and configure the Port Probe Dashboard application.

## Prerequisites
- Docker and Docker Compose installed
- Go installed (version 1.16+)

## Step 1: Start the Application

```bash
cd /path/to/port-probe-dash-main
docker-compose up -d
```

This will start three containers:
- PostgreSQL database on port 5432
- Go backend on port 8080
- React frontend on port 3001

## Step 2: Check Container Status

```bash
docker ps -a
```

Verify all three containers are running:
- `cmdb-postgres`
- `cmdb-backend`
- `cmdb-frontend`

## Step 3: Create Admin User (Using Script)

The easiest way to create an admin user is using the provided script. You can customize the admin credentials using environment variables:

### Option 1: Use Default Credentials
```bash
cd /path/to/port-probe-dash-main
go run create_admin_user.go
```

This will create a user with:
- Email: `admin@example.com`
- Username: `admin`
- Password: `admin123`

### Option 2: Customize Credentials
```bash
export ADMIN_USERNAME=myadmin
export ADMIN_EMAIL=myemail@domain.com
export ADMIN_PASSWORD=MySecurePassword123
go run create_admin_user.go
```

### Option 3: Run Inside Docker Container
If running in a Docker environment, you can also use docker-compose exec:

```bash
cd backend
docker-compose exec backend go run /path/to/create_admin_user.go
```

Or set environment variables in docker-compose.yml and run:
```bash
docker-compose exec postgres env $(cat .env | xargs) psql -U cmdb_user -d cmdb -f - << 'EOF'
... SQL commands ...
EOF
```

### Environment Variables
The script supports these environment variables (with defaults):
- `ADMIN_USERNAME` (default: admin)
- `ADMIN_EMAIL` (default: admin@example.com)
- `ADMIN_PASSWORD` (default: admin123)
- `POSTGRES_HOST` (default: localhost)
- `POSTGRES_PORT` (default: 5432)
- `POSTGRES_DB` (default: cmdb)
- `POSTGRES_USER` (default: cmdb_user)
- `POSTGRES_PASSWORD` (default: cmdb_password)

**Note**: The script checks if the user already exists and will skip creation if found.

## Step 4: Create Sample Data (Optional)

### Create Server Groups

```bash
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "INSERT INTO server_groups (id, name, description, color, created_at, updated_at) \
   VALUES ('1', 'Web Servers', 'Production web servers', '#06b6d4', NOW(), NOW());"
```

### Create Sample Servers

```bash
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "INSERT INTO servers (id, hostname, ip_address, ssh_port, status, group_id, created_at, updated_at) \
   VALUES \
   ('1', 'web-server-01', '192.168.1.100', 22, 'online', '1', NOW(), NOW()), \
   ('2', 'db-server-01', '192.168.1.101', 22, 'online', '1', NOW(), NOW()), \
   ('3', 'app-server-01', '192.168.1.102', 22, 'warning', '1', NOW(), NOW());"
```

## Step 5: Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8080/api
- **PostgreSQL**: localhost:5432

## Step 6: Login

1. Navigate to http://localhost:3001
2. Click "Sign Up" tab
3. Create a new account
4. The account will be **automatically approved** (no admin approval needed)

## Useful Database Commands

### View all users
```bash
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c "SELECT id, email, username, approved FROM users;"
```

### View user roles
```bash
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT u.email, ur.role FROM users u JOIN user_roles ur ON u.id = ur.user_id;"
```

### Approve a user
```bash
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "UPDATE users SET approved = true WHERE email = 'user@example.com';"
```

### Add admin role to user
```bash
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "INSERT INTO user_roles (id, user_id, role, created_at) \
   VALUES (gen_random_uuid()::text, 'USER_ID_HERE', 'admin', NOW()) ON CONFLICT DO NOTHING;"
```

### View all servers
```bash
docker exec cmdb-postgres psql -U cmdb_user -d cmdb -c \
  "SELECT s.hostname, s.ip_address, s.status, g.name as group_name \
   FROM servers s LEFT JOIN server_groups g ON s.group_id = g.id;"
```

## Troubleshooting

### Check backend logs
```bash
docker logs cmdb-backend --tail 50
```

### Check frontend logs
```bash
docker logs cmdb-frontend --tail 50
```

### Check database logs
```bash
docker logs cmdb-postgres --tail 50
```

### Restart containers
```bash
docker-compose restart
```

### Rebuild and restart
```bash
docker-compose down
docker-compose up -d --build
```

### Clear browser cache (if seeing stale data)
Open browser console (F12) and run:
```javascript
localStorage.clear()
location.reload()
```

## Changes Made in This Setup

1. **User Auto-Approval**: Modified signup to automatically approve new users
2. **Sample Data**: Added sample servers and groups to demonstrate functionality
3. **Network Mappings**: Added new Mappings tab to visualize server relationships

## Key Features

- **Auto User Approval**: New users are automatically approved upon signup
- **Network Visualization**: Mappings tab shows relationships between servers
- **Sample Data**: Pre-populated with example servers for testing
- **Admin Dashboard**: Full CRUD operations on servers, groups, and users

## Next Steps

1. Add your actual server information
2. Configure SSH credentials for servers
3. Set up Prometheus integration for monitoring
4. Configure SSL certificate monitoring

## Support

For issues or questions, check the main README.md or create an issue in the repository.

