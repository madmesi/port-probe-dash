package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/cmdb/backend/internal/api"
	"github.com/cmdb/backend/internal/auth"
	"github.com/cmdb/backend/internal/database"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
)

func main() {
	// Load environment variables
	godotenv.Load()

	// Connect to database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test connection with retry
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		err = db.Ping()
		if err == nil {
			break
		}
		log.Printf("Database connection attempt %d/%d failed: %v", i+1, maxRetries, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatal("Failed to ping database after retries:", err)
	}

	log.Println("Successfully connected to database")

	// Initialize stores
	stores := &database.Stores{
		Users:       database.NewUserStore(db),
		Servers:     database.NewServerStore(db),
		Groups:      database.NewGroupStore(db),
		Permissions: database.NewPermissionStore(db),
		SSL:         database.NewSSLStore(db),
		APIKeys:     database.NewAPIKeyStore(db),
	}

	// Initialize JWT manager
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key-change-in-production"
		log.Println("Warning: Using default JWT secret. Set JWT_SECRET environment variable in production.")
	}
	jwtManager := auth.NewJWTManager(jwtSecret)

	// Initialize API handlers
	handlers := api.NewHandlers(stores, jwtManager)

	// Set up router
	router := mux.NewRouter()

	// Public routes
	router.HandleFunc("/api/auth/signup", handlers.SignUp).Methods("POST")
	router.HandleFunc("/api/auth/login", handlers.Login).Methods("POST")
	router.HandleFunc("/api/health", handlers.Health).Methods("GET")
	router.HandleFunc("/metrics", handlers.PrometheusMetrics).Methods("GET") // Prometheus metrics endpoint
	// Ingest endpoint with API key header
	router.HandleFunc("/api/ingest/metrics", handlers.IngestMetrics).Methods("POST")

	// Protected routes
	apiRouter := router.PathPrefix("/api").Subrouter()
	apiRouter.Use(auth.AuthMiddleware(jwtManager))

	apiRouter.HandleFunc("/auth/me", handlers.GetCurrentUser).Methods("GET")
	apiRouter.HandleFunc("/auth/logout", handlers.Logout).Methods("POST")

	// User routes
	apiRouter.HandleFunc("/users", handlers.ListUsers).Methods("GET")
	apiRouter.HandleFunc("/users/{id}", handlers.GetUser).Methods("GET")
	apiRouter.HandleFunc("/users/{id}", handlers.UpdateUser).Methods("PUT")
	apiRouter.HandleFunc("/users/{id}/approve", handlers.ApproveUser).Methods("POST")
	apiRouter.HandleFunc("/users/{id}/roles", handlers.UpdateUserRoles).Methods("POST")

	// Server routes
	apiRouter.HandleFunc("/servers", handlers.ListServers).Methods("GET")
	apiRouter.HandleFunc("/servers", handlers.CreateServer).Methods("POST")
	apiRouter.HandleFunc("/servers/{id}", handlers.GetServer).Methods("GET")
	apiRouter.HandleFunc("/servers/{id}", handlers.UpdateServer).Methods("PUT")
	apiRouter.HandleFunc("/servers/{id}", handlers.DeleteServer).Methods("DELETE")

	// Group routes
	apiRouter.HandleFunc("/groups", handlers.ListGroups).Methods("GET")
	apiRouter.HandleFunc("/groups", handlers.CreateGroup).Methods("POST")
	apiRouter.HandleFunc("/groups/{id}", handlers.GetGroup).Methods("GET")
	apiRouter.HandleFunc("/groups/{id}", handlers.UpdateGroup).Methods("PUT")
	apiRouter.HandleFunc("/groups/{id}", handlers.DeleteGroup).Methods("DELETE")

	// Permission routes
	apiRouter.HandleFunc("/permissions", handlers.ListPermissions).Methods("GET")
	apiRouter.HandleFunc("/permissions", handlers.CreatePermission).Methods("POST")
	apiRouter.HandleFunc("/permissions/{id}", handlers.DeletePermission).Methods("DELETE")

	// API Keys (admin only)
	apiRouter.HandleFunc("/api-keys", handlers.ListAPIKeys).Methods("GET")
	apiRouter.HandleFunc("/api-keys", handlers.CreateAPIKey).Methods("POST")
	apiRouter.HandleFunc("/api-keys/status", handlers.SetAPIKeyStatus).Methods("POST")
	apiRouter.HandleFunc("/api-keys/delete", handlers.DeleteAPIKey).Methods("POST")

	// SSL Certificate routes
	apiRouter.HandleFunc("/ssl-certificates", handlers.ListSSLCertificates).Methods("GET")
	apiRouter.HandleFunc("/ssl-certificates", handlers.CreateSSLCertificate).Methods("POST")
	apiRouter.HandleFunc("/ssl-certificates/{id}", handlers.GetSSLCertificate).Methods("GET")
	apiRouter.HandleFunc("/ssl-certificates/{id}", handlers.UpdateSSLCertificate).Methods("PUT")
	apiRouter.HandleFunc("/ssl-certificates/{id}", handlers.DeleteSSLCertificate).Methods("DELETE")
	apiRouter.HandleFunc("/ssl-certificates/send-alerts", handlers.SendAlertsToAlertmanager).Methods("POST")

	// WebSocket route for SSH
	router.HandleFunc("/ws/ssh/{serverId}", handlers.HandleSSH)

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	// Start server
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
