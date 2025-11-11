package database

import (
	"database/sql"
	"time"
)

type SSLCertificate struct {
	ID            string     `json:"id"`
	ServerID      string     `json:"server_id"`
	Domain        string     `json:"domain"`
	Issuer        *string    `json:"issuer"`
	IssuedAt      time.Time  `json:"issued_at"`
	ExpiresAt     time.Time  `json:"expires_at"`
	Status        string     `json:"status"`
	AutoRenew     bool       `json:"auto_renew"`
	LastCheckedAt *time.Time `json:"last_checked_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type SSLStore struct {
	db *sql.DB
}

func NewSSLStore(db *sql.DB) *SSLStore {
	return &SSLStore{db: db}
}

func (s *SSLStore) Create(cert *SSLCertificate) (*SSLCertificate, error) {
	now := time.Now()
	err := s.db.QueryRow(`
		INSERT INTO ssl_certificates (server_id, domain, issuer, issued_at, expires_at, status, auto_renew, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`, cert.ServerID, cert.Domain, cert.Issuer, cert.IssuedAt, cert.ExpiresAt, cert.Status, cert.AutoRenew, now, now).Scan(
		&cert.ID, &cert.CreatedAt, &cert.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return cert, nil
}

func (s *SSLStore) GetByID(id string) (*SSLCertificate, error) {
	cert := &SSLCertificate{}
	err := s.db.QueryRow(`
		SELECT id, server_id, domain, issuer, issued_at, expires_at, status, auto_renew, last_checked_at, created_at, updated_at
		FROM ssl_certificates
		WHERE id = $1
	`, id).Scan(
		&cert.ID, &cert.ServerID, &cert.Domain, &cert.Issuer, &cert.IssuedAt, &cert.ExpiresAt,
		&cert.Status, &cert.AutoRenew, &cert.LastCheckedAt, &cert.CreatedAt, &cert.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return cert, nil
}

func (s *SSLStore) List(userID string, isAdmin bool) ([]*SSLCertificate, error) {
	var rows *sql.Rows
	var err error

	if isAdmin {
		rows, err = s.db.Query(`
			SELECT c.id, c.server_id, c.domain, c.issuer, c.issued_at, c.expires_at, 
			       c.status, c.auto_renew, c.last_checked_at, c.created_at, c.updated_at
			FROM ssl_certificates c
			ORDER BY c.expires_at ASC
		`)
	} else {
		rows, err = s.db.Query(`
			SELECT c.id, c.server_id, c.domain, c.issuer, c.issued_at, c.expires_at,
			       c.status, c.auto_renew, c.last_checked_at, c.created_at, c.updated_at
			FROM ssl_certificates c
			INNER JOIN user_server_permissions p ON c.server_id = p.server_id
			WHERE p.user_id = $1
			ORDER BY c.expires_at ASC
		`, userID)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var certs []*SSLCertificate
	for rows.Next() {
		cert := &SSLCertificate{}
		err := rows.Scan(
			&cert.ID, &cert.ServerID, &cert.Domain, &cert.Issuer, &cert.IssuedAt, &cert.ExpiresAt,
			&cert.Status, &cert.AutoRenew, &cert.LastCheckedAt, &cert.CreatedAt, &cert.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		certs = append(certs, cert)
	}

	return certs, nil
}

func (s *SSLStore) Update(id string, cert *SSLCertificate) error {
	_, err := s.db.Exec(`
		UPDATE ssl_certificates
		SET domain = $1, issuer = $2, issued_at = $3, expires_at = $4,
		    status = $5, auto_renew = $6, updated_at = NOW()
		WHERE id = $7
	`, cert.Domain, cert.Issuer, cert.IssuedAt, cert.ExpiresAt, cert.Status, cert.AutoRenew, id)
	return err
}

func (s *SSLStore) Delete(id string) error {
	_, err := s.db.Exec("DELETE FROM ssl_certificates WHERE id = $1", id)
	return err
}
