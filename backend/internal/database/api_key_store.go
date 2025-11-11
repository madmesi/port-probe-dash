package database

import (
    "crypto/sha256"
    "database/sql"
    "encoding/hex"
    "errors"
    "time"

    "github.com/google/uuid"
)

type APIKeyStore struct {
    db *sql.DB
}

func NewAPIKeyStore(db *sql.DB) *APIKeyStore {
    return &APIKeyStore{db: db}
}

func (s *APIKeyStore) List() ([]*APIKey, error) {
    rows, err := s.db.Query(`SELECT id, name, key_prefix, created_by, created_at, last_used_at, expires_at, is_active FROM api_keys ORDER BY created_at DESC`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var keys []*APIKey
    for rows.Next() {
        k := &APIKey{}
        err := rows.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.CreatedBy, &k.CreatedAt, &k.LastUsedAt, &k.ExpiresAt, &k.IsActive)
        if err != nil {
            return nil, err
        }
        keys = append(keys, k)
    }
    return keys, nil
}

func (s *APIKeyStore) Create(name, createdBy, rawKey string, expiresAt *time.Time) (*APIKey, error) {
    id := uuid.New().String()
    keyHash := sha256.Sum256([]byte(rawKey))
    keyHashHex := hex.EncodeToString(keyHash[:])
    keyPrefix := ""
    if len(rawKey) >= 12 {
        keyPrefix = rawKey[:12]
    } else {
        keyPrefix = rawKey
    }

    createdAt := time.Now()

    _, err := s.db.Exec(`INSERT INTO api_keys (id, name, key_hash, key_prefix, created_by, created_at, expires_at, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
        id, name, keyHashHex, keyPrefix, createdBy, createdAt, expiresAt,
    )
    if err != nil {
        return nil, err
    }

    return &APIKey{
        ID:        id,
        Name:      name,
        KeyPrefix: keyPrefix,
        CreatedBy: createdBy,
        CreatedAt: createdAt,
        ExpiresAt: expiresAt,
        IsActive:  true,
    }, nil
}

func (s *APIKeyStore) SetActive(id string, active bool) error {
    _, err := s.db.Exec(`UPDATE api_keys SET is_active=$2 WHERE id=$1`, id, active)
    return err
}

func (s *APIKeyStore) Delete(id string) error {
    _, err := s.db.Exec(`DELETE FROM api_keys WHERE id=$1`, id)
    return err
}

func (s *APIKeyStore) VerifyAndTouch(rawKey string) (*APIKey, error) {
    keyHash := sha256.Sum256([]byte(rawKey))
    keyHashHex := hex.EncodeToString(keyHash[:])

    row := s.db.QueryRow(`SELECT id, name, key_prefix, created_by, created_at, last_used_at, expires_at, is_active FROM api_keys WHERE key_hash=$1`, keyHashHex)
    k := &APIKey{}
    err := row.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.CreatedBy, &k.CreatedAt, &k.LastUsedAt, &k.ExpiresAt, &k.IsActive)
    if err == sql.ErrNoRows {
        return nil, errors.New("invalid api key")
    }
    if err != nil {
        return nil, err
    }
    if !k.IsActive {
        return nil, errors.New("api key inactive")
    }
    if k.ExpiresAt != nil && time.Now().After(*k.ExpiresAt) {
        return nil, errors.New("api key expired")
    }

    now := time.Now()
    _, _ = s.db.Exec(`UPDATE api_keys SET last_used_at=$2 WHERE id=$1`, k.ID, now)
    k.LastUsedAt = &now
    return k, nil
}

