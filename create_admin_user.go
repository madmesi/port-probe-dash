package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Get environment variables with defaults
	dbUser := getEnv("POSTGRES_USER", "cmdb_user")
	dbPassword := getEnv("POSTGRES_PASSWORD", "cmdb_password")
	dbName := getEnv("POSTGRES_DB", "cmdb")
	dbHost := getEnv("POSTGRES_HOST", "localhost")
	dbPort := getEnv("POSTGRES_PORT", "5432")

	adminUsername := getEnv("ADMIN_USERNAME", "admin")
	adminEmail := getEnv("ADMIN_EMAIL", "admin@example.com")
	adminPassword := getEnv("ADMIN_PASSWORD", "admin123")

	// Connect to database
	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		dbUser, dbPassword, dbHost, dbPort, dbName)
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect:", err)
	}
	defer db.Close()

	// Check if user already exists
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", adminEmail).Scan(&count)
	if err != nil {
		log.Fatal("Failed to check existing user:", err)
	}
	if count > 0 {
		fmt.Printf("User %s already exists, skipping creation.\n", adminEmail)
		return
	}

	// Generate bcrypt hash for password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	// Create user
	userID := uuid.New().String()
	now := time.Now()

	_, err = db.Exec(
		`INSERT INTO users (id, username, email, password, approved, created_at, updated_at) 
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		userID, adminUsername, adminEmail, string(hashedPassword), true, now, now,
	)
	if err != nil {
		log.Fatal("Failed to create user:", err)
	}

	// Create admin role
	roleID := uuid.New().String()
	_, err = db.Exec(
		`INSERT INTO user_roles (id, user_id, role, created_at) 
		 VALUES ($1, $2, $3, $4)`,
		roleID, userID, "admin", now,
	)
	if err != nil {
		log.Fatal("Failed to create role:", err)
	}

	fmt.Println("User created successfully!")
	fmt.Println("Email:", adminEmail)
	fmt.Println("Password:", adminPassword)
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
