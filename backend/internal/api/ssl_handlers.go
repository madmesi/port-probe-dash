package api

import (
	"encoding/json"
	"net/http"

	"github.com/cmdb/backend/internal/auth"
	"github.com/cmdb/backend/internal/database"
	"github.com/gorilla/mux"
)

// ListSSLCertificates returns all SSL certificates for the authenticated user
func (h *Handlers) ListSSLCertificates(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	certs, err := h.stores.SSL.List(userID, isAdmin)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(certs)
}

// CreateSSLCertificate creates a new SSL certificate
func (h *Handlers) CreateSSLCertificate(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")
	
	if !isAdmin {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var cert database.SSLCertificate
	if err := json.NewDecoder(r.Body).Decode(&cert); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if cert.Status == "" {
		cert.Status = "active"
	}

	created, err := h.stores.SSL.Create(&cert)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

// GetSSLCertificate returns a single SSL certificate by ID
func (h *Handlers) GetSSLCertificate(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	cert, err := h.stores.SSL.GetByID(id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Certificate not found")
		return
	}

	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	// Check if user has permission
	if !isAdmin {
		hasPermission, err := h.stores.Permissions.HasAccess(userID, cert.ServerID)
		if err != nil || !hasPermission {
			respondError(w, http.StatusForbidden, "Forbidden")
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cert)
}

// UpdateSSLCertificate updates an existing SSL certificate
func (h *Handlers) UpdateSSLCertificate(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")
	
	if !isAdmin {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	var cert database.SSLCertificate
	if err := json.NewDecoder(r.Body).Decode(&cert); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.stores.SSL.Update(id, &cert); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Certificate updated successfully"})
}

// DeleteSSLCertificate deletes an SSL certificate
func (h *Handlers) DeleteSSLCertificate(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")
	
	if !isAdmin {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	if err := h.stores.SSL.Delete(id); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Certificate deleted successfully"})
}
