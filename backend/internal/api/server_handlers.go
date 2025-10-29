package api

import (
	"encoding/json"
	"net/http"

	"github.com/cmdb/backend/internal/auth"
	"github.com/cmdb/backend/internal/database"
	"github.com/gorilla/mux"
)

func (h *Handlers) ListServers(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	servers, err := h.stores.Servers.List(userID, isAdmin)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch servers")
		return
	}

	respondJSON(w, http.StatusOK, servers)
}

func (h *Handlers) CreateServer(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	var server database.Server
	if err := json.NewDecoder(r.Body).Decode(&server); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if server.SSHPort == 0 {
		server.SSHPort = 22
	}
	if server.Status == "" {
		server.Status = "unknown"
	}

	created, err := h.stores.Servers.Create(&server)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create server")
		return
	}

	respondJSON(w, http.StatusCreated, created)
}

func (h *Handlers) GetServer(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	vars := mux.Vars(r)
	id := vars["id"]

	server, err := h.stores.Servers.GetByID(id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Server not found")
		return
	}

	// Check permissions
	if !isAdmin {
		hasAccess, _ := h.stores.Permissions.HasAccess(userID, id)
		if !hasAccess {
			respondError(w, http.StatusForbidden, "Access denied")
			return
		}
	}

	respondJSON(w, http.StatusOK, server)
}

func (h *Handlers) UpdateServer(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	var server database.Server
	if err := json.NewDecoder(r.Body).Decode(&server); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	err := h.stores.Servers.Update(id, &server)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update server")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Server updated successfully"})
}

func (h *Handlers) DeleteServer(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	err := h.stores.Servers.Delete(id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete server")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Server deleted successfully"})
}
