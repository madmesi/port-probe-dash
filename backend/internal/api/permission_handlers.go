package api

import (
	"encoding/json"
	"net/http"

	"github.com/cmdb/backend/internal/auth"
	"github.com/gorilla/mux"
)

func (h *Handlers) ListPermissions(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	perms, err := h.stores.Permissions.List()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch permissions")
		return
	}

	respondJSON(w, http.StatusOK, perms)
}

func (h *Handlers) CreatePermission(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	var req struct {
		UserID   string `json:"user_id"`
		ServerID string `json:"server_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	perm, err := h.stores.Permissions.Create(req.UserID, req.ServerID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create permission")
		return
	}

	respondJSON(w, http.StatusCreated, perm)
}

func (h *Handlers) DeletePermission(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	err := h.stores.Permissions.Delete(id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete permission")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Permission deleted successfully"})
}
