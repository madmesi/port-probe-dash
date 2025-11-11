package api

import (
	"encoding/json"
	"net/http"

	"github.com/cmdb/backend/internal/auth"
	"github.com/cmdb/backend/internal/database"
	"github.com/gorilla/mux"
)

type Handlers struct {
	stores     *database.Stores
	jwtManager *auth.JWTManager
}

func NewHandlers(stores *database.Stores, jwtManager *auth.JWTManager) *Handlers {
	return &Handlers{
		stores:     stores,
		jwtManager: jwtManager,
	}
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// Health check
func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// Auth handlers
func (h *Handlers) SignUp(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Username string `json:"username"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	username := req.Username
	if username == "" {
		username = req.Email
	}

	user, err := h.stores.Users.Create(username, req.Email, req.Password)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Auto-approve new users
	approved := true
	err = h.stores.Users.Update(user.ID, nil, &approved)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to approve user")
		return
	}
	user.Approved = true

	token, err := h.jwtManager.Generate(user.ID, user.Email)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"user":  user,
		"token": token,
	})
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.stores.Users.GetByEmail(req.Email)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if !h.stores.Users.VerifyPassword(user.Password, req.Password) {
		respondError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if !user.Approved {
		respondError(w, http.StatusForbidden, "Your account is pending approval")
		return
	}

	token, err := h.jwtManager.Generate(user.ID, user.Email)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	// Get user roles
	roles, _ := h.stores.Users.GetRoles(user.ID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"user":  user,
		"token": token,
		"roles": roles,
	})
}

func (h *Handlers) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	user, err := h.stores.Users.GetByID(userID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	roles, _ := h.stores.Users.GetRoles(userID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"user":  user,
		"roles": roles,
	})
}

func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

// User handlers
func (h *Handlers) ListUsers(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	users, err := h.stores.Users.List()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch users")
		return
	}

	// Get roles for each user
	type UserWithRoles struct {
		*database.User
		Roles []string `json:"roles"`
	}

	var usersWithRoles []UserWithRoles
	for _, user := range users {
		roles, _ := h.stores.Users.GetRoles(user.ID)
		usersWithRoles = append(usersWithRoles, UserWithRoles{
			User:  user,
			Roles: roles,
		})
	}

	respondJSON(w, http.StatusOK, usersWithRoles)
}

func (h *Handlers) GetUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	user, err := h.stores.Users.GetByID(id)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	roles, _ := h.stores.Users.GetRoles(id)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"user":  user,
		"roles": roles,
	})
}

func (h *Handlers) UpdateUser(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	vars := mux.Vars(r)
	id := vars["id"]

	// Only admins or the user themselves can update
	if !isAdmin && userID != id {
		respondError(w, http.StatusForbidden, "Access denied")
		return
	}

	var req struct {
		DisplayName *string `json:"display_name"`
		Approved    *bool   `json:"approved"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Only admins can approve users
	if req.Approved != nil && !isAdmin {
		respondError(w, http.StatusForbidden, "Only admins can approve users")
		return
	}

	err := h.stores.Users.Update(id, req.DisplayName, req.Approved)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update user")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "User updated successfully"})
}

func (h *Handlers) ApproveUser(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	approved := true
	err := h.stores.Users.Update(id, nil, &approved)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to approve user")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "User approved successfully"})
}

func (h *Handlers) UpdateUserRoles(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	var req struct {
		Roles []string `json:"roles"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	err := h.stores.Users.SetRoles(id, req.Roles)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update roles")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Roles updated successfully"})
}
