package database

import (
	"time"
)

type User struct {
	ID          string    `json:"id"`
	Username    string    `json:"username"`
	Email       string    `json:"email"`
	Password    string    `json:"-"`
	DisplayName *string   `json:"display_name"`
	Approved    bool      `json:"approved"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type UserRole struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type Server struct {
	ID            string     `json:"id"`
	Hostname      string     `json:"hostname"`
	IPAddress     string     `json:"ip_address"`
	SSHPort       int        `json:"ssh_port"`
	SSHUsername   *string    `json:"ssh_username"`
	SSHKeyPath    *string    `json:"ssh_key_path"`
	PrometheusURL *string    `json:"prometheus_url"`
	Status        string     `json:"status"`
	GroupID       *string    `json:"group_id"`
	Tags          []string   `json:"tags"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type ServerGroup struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Color       string    `json:"color"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type UserServerPermission struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	ServerID  string    `json:"server_id"`
	CreatedAt time.Time `json:"created_at"`
}

type Stores struct {
	Users       *UserStore
	Servers     *ServerStore
	Groups      *GroupStore
	Permissions *PermissionStore
	SSL         *SSLStore
    APIKeys     *APIKeyStore
}

type APIKey struct {
    ID          string     `json:"id"`
    Name        string     `json:"name"`
    KeyHash     string     `json:"-"`
    KeyPrefix   string     `json:"key_prefix"`
    CreatedBy   string     `json:"created_by"`
    CreatedAt   time.Time  `json:"created_at"`
    LastUsedAt  *time.Time `json:"last_used_at"`
    ExpiresAt   *time.Time `json:"expires_at"`
    IsActive    bool       `json:"is_active"`
}
