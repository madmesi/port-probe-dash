package api

import (
	"encoding/json"
	"net/http"

	"github.com/cmdb/backend/internal/auth"
	"github.com/cmdb/backend/internal/database"
	"github.com/gorilla/mux"
)

func (h *Handlers) ListGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := h.stores.Groups.List()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch groups")
		return
	}

	respondJSON(w, http.StatusOK, groups)
}

func (h *Handlers) CreateGroup(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	var group database.ServerGroup
	if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if group.Color == "" {
		group.Color = "#06b6d4"
	}

	created, err := h.stores.Groups.Create(&group)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create group")
		return
	}

	respondJSON(w, http.StatusCreated, created)
}

func (h *Handlers) GetGroup(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	group, err := h.stores.Groups.GetByID(id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Group not found")
		return
	}

	respondJSON(w, http.StatusOK, group)
}

func (h *Handlers) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	var group database.ServerGroup
	if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	err := h.stores.Groups.Update(id, &group)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update group")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Group updated successfully"})
}

func (h *Handlers) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	err := h.stores.Groups.Delete(id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete group")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Group deleted successfully"})
}
