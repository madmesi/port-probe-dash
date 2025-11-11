# CMDB Backend (Go)

## Getting Started

This directory is a placeholder for your Go backend implementation.

### Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # Application entry point
├── internal/
│   ├── api/                 # HTTP handlers
│   ├── models/              # Data models
│   ├── repository/          # Database layer
│   ├── service/             # Business logic
│   └── ssh/                 # SSH connection handler
├── migrations/              # Database migrations
├── go.mod
├── go.sum
└── Dockerfile
```

### Initialize Go Module

```bash
cd backend
go mod init github.com/yourusername/cmdb-backend
```

### Required Dependencies

```bash
go get github.com/lib/pq                    # PostgreSQL driver
go get github.com/gorilla/mux               # HTTP router
go get github.com/gorilla/websocket         # WebSocket for SSH terminal
go get golang.org/x/crypto/ssh              # SSH client
go get github.com/joho/godotenv             # Environment variables
```

### API Endpoints to Implement

#### Servers
- `GET /api/servers` - List all servers
- `GET /api/servers/:id` - Get server details
- `POST /api/servers` - Add new server
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server

#### Ports
- `GET /api/servers/:id/ports` - List server ports
- `POST /api/servers/:id/ports/scan` - Scan ports

#### Interfaces
- `GET /api/servers/:id/interfaces` - List network interfaces

#### Services
- `GET /api/servers/:id/services` - List running services

#### Destinations
- `GET /api/servers/:id/destinations` - List communication destinations

#### SSH
- `WS /ws/ssh/:serverId` - WebSocket SSH connection

### Environment Variables

Create a `.env` file:

```
DATABASE_URL=postgres://cmdb_user:cmdb_password@postgres:5432/cmdb?sslmode=disable
SERVER_PORT=8080
```

### Running Locally

```bash
go run cmd/server/main.go
```

### Running with Docker

The backend is included in the docker-compose setup. Just run:

```bash
docker-compose up
```
