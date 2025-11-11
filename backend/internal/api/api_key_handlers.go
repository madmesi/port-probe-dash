package api

import (
    "encoding/json"
    "net/http"
    "time"

    "github.com/cmdb/backend/internal/auth"
)

type createAPIKeyRequest struct {
    Name      string     `json:"name"`
    ExpiresAt *time.Time `json:"expires_at"`
}

func (h *Handlers) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
    userID := auth.GetUserID(r.Context())
    isAdmin, _ := h.stores.Users.HasRole(userID, "admin")
    if !isAdmin {
        respondError(w, http.StatusForbidden, "Admin access required")
        return
    }
    keys, err := h.stores.APIKeys.List()
    if err != nil {
        respondError(w, http.StatusInternalServerError, "Failed to fetch API keys")
        return
    }
    respondJSON(w, http.StatusOK, keys)
}

func (h *Handlers) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
    userID := auth.GetUserID(r.Context())
    isAdmin, _ := h.stores.Users.HasRole(userID, "admin")
    if !isAdmin {
        respondError(w, http.StatusForbidden, "Admin access required")
        return
    }

    var req createAPIKeyRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondError(w, http.StatusBadRequest, "Invalid request body")
        return
    }
    if req.Name == "" {
        respondError(w, http.StatusBadRequest, "Name is required")
        return
    }

    // Generate secure random key on server
    rawKey := auth.GenerateSecureAPIKey()
    key, err := h.stores.APIKeys.Create(req.Name, userID, rawKey, req.ExpiresAt)
    if err != nil {
        respondError(w, http.StatusInternalServerError, "Failed to create API key")
        return
    }
    // Return only prefix and full key once
    respondJSON(w, http.StatusCreated, map[string]interface{}{
        "key":       rawKey,
        "key_prefix": key.KeyPrefix,
        "record":    key,
    })
}

func (h *Handlers) SetAPIKeyStatus(w http.ResponseWriter, r *http.Request) {
    userID := auth.GetUserID(r.Context())
    isAdmin, _ := h.stores.Users.HasRole(userID, "admin")
    if !isAdmin {
        respondError(w, http.StatusForbidden, "Admin access required")
        return
    }
    var req struct {
        ID     string `json:"id"`
        Active bool   `json:"active"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ID == "" {
        respondError(w, http.StatusBadRequest, "Invalid request body")
        return
    }
    if err := h.stores.APIKeys.SetActive(req.ID, req.Active); err != nil {
        respondError(w, http.StatusInternalServerError, "Failed to update API key status")
        return
    }
    respondJSON(w, http.StatusOK, map[string]string{"message": "updated"})
}

func (h *Handlers) DeleteAPIKey(w http.ResponseWriter, r *http.Request) {
    userID := auth.GetUserID(r.Context())
    isAdmin, _ := h.stores.Users.HasRole(userID, "admin")
    if !isAdmin {
        respondError(w, http.StatusForbidden, "Admin access required")
        return
    }
    var req struct{ ID string `json:"id"` }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ID == "" {
        respondError(w, http.StatusBadRequest, "Invalid request body")
        return
    }
    if err := h.stores.APIKeys.Delete(req.ID); err != nil {
        respondError(w, http.StatusInternalServerError, "Failed to delete API key")
        return
    }
    respondJSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}

