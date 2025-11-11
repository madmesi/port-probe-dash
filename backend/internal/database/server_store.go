package database

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type ServerStore struct {
	db *sql.DB
}

func NewServerStore(db *sql.DB) *ServerStore {
	return &ServerStore{db: db}
}

func (s *ServerStore) Create(server *Server) (*Server, error) {
	server.ID = uuid.New().String()
	server.CreatedAt = time.Now()
	server.UpdatedAt = time.Now()

	if server.Tags == nil {
		server.Tags = []string{}
	}

	query := `
		INSERT INTO servers (id, hostname, ip_address, ssh_port, ssh_username, ssh_key_path, prometheus_url, status, group_id, tags, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, hostname, ip_address, ssh_port, ssh_username, ssh_key_path, prometheus_url, status, group_id, tags, created_at, updated_at
	`

	err := s.db.QueryRow(query, server.ID, server.Hostname, server.IPAddress, server.SSHPort, server.SSHUsername,
		server.SSHKeyPath, server.PrometheusURL, server.Status, server.GroupID, server.Tags, server.CreatedAt, server.UpdatedAt).
		Scan(&server.ID, &server.Hostname, &server.IPAddress, &server.SSHPort, &server.SSHUsername,
			&server.SSHKeyPath, &server.PrometheusURL, &server.Status, &server.GroupID, &server.Tags, &server.CreatedAt, &server.UpdatedAt)

	return server, err
}

func (s *ServerStore) GetByID(id string) (*Server, error) {
	server := &Server{}
	query := `
		SELECT id, hostname, ip_address, ssh_port, ssh_username, ssh_key_path, prometheus_url, status, group_id, tags, created_at, updated_at
		FROM servers
		WHERE id = $1
	`

	err := s.db.QueryRow(query, id).Scan(
		&server.ID, &server.Hostname, &server.IPAddress, &server.SSHPort, &server.SSHUsername,
		&server.SSHKeyPath, &server.PrometheusURL, &server.Status, &server.GroupID, &server.Tags, &server.CreatedAt, &server.UpdatedAt,
	)

	return server, err
}

func (s *ServerStore) List(userID string, isAdmin bool) ([]*Server, error) {
	var query string
	var rows *sql.Rows
	var err error

	if isAdmin {
		query = `
			SELECT id, hostname, ip_address, ssh_port, ssh_username, ssh_key_path, prometheus_url, status, group_id, tags, created_at, updated_at
			FROM servers
			ORDER BY hostname
		`
		rows, err = s.db.Query(query)
	} else {
		query = `
			SELECT s.id, s.hostname, s.ip_address, s.ssh_port, s.ssh_username, s.ssh_key_path, s.prometheus_url, s.status, s.group_id, s.tags, s.created_at, s.updated_at
			FROM servers s
			INNER JOIN user_server_permissions p ON s.id = p.server_id
			WHERE p.user_id = $1
			ORDER BY s.hostname
		`
		rows, err = s.db.Query(query, userID)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var servers []*Server
	for rows.Next() {
		server := &Server{}
		err := rows.Scan(&server.ID, &server.Hostname, &server.IPAddress, &server.SSHPort, &server.SSHUsername,
			&server.SSHKeyPath, &server.PrometheusURL, &server.Status, &server.GroupID, &server.Tags, &server.CreatedAt, &server.UpdatedAt)
		if err != nil {
			return nil, err
		}
		servers = append(servers, server)
	}

	return servers, nil
}

func (s *ServerStore) Update(id string, server *Server) error {
	server.UpdatedAt = time.Now()

	if server.Tags == nil {
		server.Tags = []string{}
	}

	query := `
		UPDATE servers
		SET hostname = $2, ip_address = $3, ssh_port = $4, ssh_username = $5, ssh_key_path = $6,
		    prometheus_url = $7, status = $8, group_id = $9, tags = $10, updated_at = $11
		WHERE id = $1
	`

	_, err := s.db.Exec(query, id, server.Hostname, server.IPAddress, server.SSHPort, server.SSHUsername,
		server.SSHKeyPath, server.PrometheusURL, server.Status, server.GroupID, server.Tags, server.UpdatedAt)

	return err
}

func (s *ServerStore) Delete(id string) error {
	_, err := s.db.Exec("DELETE FROM servers WHERE id = $1", id)
	return err
}
