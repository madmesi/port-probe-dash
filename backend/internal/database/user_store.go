package database

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserStore struct {
	db *sql.DB
}

func NewUserStore(db *sql.DB) *UserStore {
	return &UserStore{db: db}
}

func (s *UserStore) Create(username, email, password string) (*User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &User{
		ID:        uuid.New().String(),
		Username:  username,
		Email:     email,
		Password:  string(hashedPassword),
		Approved:  false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	query := `
		INSERT INTO users (id, username, email, password, approved, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, username, email, approved, created_at, updated_at
	`

	err = s.db.QueryRow(query, user.ID, user.Username, user.Email, user.Password, user.Approved, user.CreatedAt, user.UpdatedAt).
		Scan(&user.ID, &user.Username, &user.Email, &user.Approved, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserStore) GetByEmail(email string) (*User, error) {
	user := &User{}
	query := `
		SELECT id, username, email, password, display_name, approved, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	err := s.db.QueryRow(query, email).Scan(
		&user.ID, &user.Username, &user.Email, &user.Password, &user.DisplayName,
		&user.Approved, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserStore) GetByID(id string) (*User, error) {
	user := &User{}
	query := `
		SELECT id, username, email, display_name, approved, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	err := s.db.QueryRow(query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.DisplayName,
		&user.Approved, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserStore) List() ([]*User, error) {
	query := `
		SELECT id, username, email, display_name, approved, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		user := &User{}
		err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.DisplayName, &user.Approved, &user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

func (s *UserStore) Update(id string, displayName *string, approved *bool) error {
	query := `
		UPDATE users
		SET display_name = COALESCE($2, display_name),
		    approved = COALESCE($3, approved),
		    updated_at = $4
		WHERE id = $1
	`

	_, err := s.db.Exec(query, id, displayName, approved, time.Now())
	return err
}

func (s *UserStore) VerifyPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

func (s *UserStore) GetRoles(userID string) ([]string, error) {
	query := `SELECT role FROM user_roles WHERE user_id = $1`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}

	return roles, nil
}

func (s *UserStore) HasRole(userID, role string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = $1 AND role = $2)`
	err := s.db.QueryRow(query, userID, role).Scan(&exists)
	return exists, err
}

func (s *UserStore) SetRoles(userID string, roles []string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete existing roles
	_, err = tx.Exec("DELETE FROM user_roles WHERE user_id = $1", userID)
	if err != nil {
		return err
	}

	// Insert new roles
	for _, role := range roles {
		_, err = tx.Exec("INSERT INTO user_roles (id, user_id, role, created_at) VALUES ($1, $2, $3, $4)",
			uuid.New().String(), userID, role, time.Now())
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
