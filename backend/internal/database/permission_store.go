package database

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type PermissionStore struct {
	db *sql.DB
}

func NewPermissionStore(db *sql.DB) *PermissionStore {
	return &PermissionStore{db: db}
}

func (s *PermissionStore) Create(userID, serverID string) (*UserServerPermission, error) {
	perm := &UserServerPermission{
		ID:        uuid.New().String(),
		UserID:    userID,
		ServerID:  serverID,
		CreatedAt: time.Now(),
	}

	query := `
		INSERT INTO user_server_permissions (id, user_id, server_id, created_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, server_id, created_at
	`

	err := s.db.QueryRow(query, perm.ID, perm.UserID, perm.ServerID, perm.CreatedAt).
		Scan(&perm.ID, &perm.UserID, &perm.ServerID, &perm.CreatedAt)

	return perm, err
}

func (s *PermissionStore) List() ([]*UserServerPermission, error) {
	query := `
		SELECT id, user_id, server_id, created_at
		FROM user_server_permissions
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []*UserServerPermission
	for rows.Next() {
		perm := &UserServerPermission{}
		err := rows.Scan(&perm.ID, &perm.UserID, &perm.ServerID, &perm.CreatedAt)
		if err != nil {
			return nil, err
		}
		perms = append(perms, perm)
	}

	return perms, nil
}

func (s *PermissionStore) Delete(id string) error {
	_, err := s.db.Exec("DELETE FROM user_server_permissions WHERE id = $1", id)
	return err
}

func (s *PermissionStore) HasAccess(userID, serverID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM user_server_permissions WHERE user_id = $1 AND server_id = $2)`
	err := s.db.QueryRow(query, userID, serverID).Scan(&exists)
	return exists, err
}
