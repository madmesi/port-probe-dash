package database

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type GroupStore struct {
	db *sql.DB
}

func NewGroupStore(db *sql.DB) *GroupStore {
	return &GroupStore{db: db}
}

func (s *GroupStore) Create(group *ServerGroup) (*ServerGroup, error) {
	group.ID = uuid.New().String()
	group.CreatedAt = time.Now()
	group.UpdatedAt = time.Now()

	query := `
		INSERT INTO server_groups (id, name, description, color, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, description, color, created_at, updated_at
	`

	err := s.db.QueryRow(query, group.ID, group.Name, group.Description, group.Color, group.CreatedAt, group.UpdatedAt).
		Scan(&group.ID, &group.Name, &group.Description, &group.Color, &group.CreatedAt, &group.UpdatedAt)

	return group, err
}

func (s *GroupStore) GetByID(id string) (*ServerGroup, error) {
	group := &ServerGroup{}
	query := `
		SELECT id, name, description, color, created_at, updated_at
		FROM server_groups
		WHERE id = $1
	`

	err := s.db.QueryRow(query, id).Scan(&group.ID, &group.Name, &group.Description, &group.Color, &group.CreatedAt, &group.UpdatedAt)
	return group, err
}

func (s *GroupStore) List() ([]*ServerGroup, error) {
	query := `
		SELECT id, name, description, color, created_at, updated_at
		FROM server_groups
		ORDER BY name
	`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []*ServerGroup
	for rows.Next() {
		group := &ServerGroup{}
		err := rows.Scan(&group.ID, &group.Name, &group.Description, &group.Color, &group.CreatedAt, &group.UpdatedAt)
		if err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}

	return groups, nil
}

func (s *GroupStore) Update(id string, group *ServerGroup) error {
	group.UpdatedAt = time.Now()

	query := `
		UPDATE server_groups
		SET name = $2, description = $3, color = $4, updated_at = $5
		WHERE id = $1
	`

	_, err := s.db.Exec(query, id, group.Name, group.Description, group.Color, group.UpdatedAt)
	return err
}

func (s *GroupStore) Delete(id string) error {
	_, err := s.db.Exec("DELETE FROM server_groups WHERE id = $1", id)
	return err
}
