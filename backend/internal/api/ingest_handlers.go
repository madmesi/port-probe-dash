package api

import (
    "encoding/json"
    "net/http"
)

// IngestMetrics accepts JSON payloads from external servers authenticated by API key
func (h *Handlers) IngestMetrics(w http.ResponseWriter, r *http.Request) {
    apiKey := r.Header.Get("X-API-Key")
    if apiKey == "" {
        respondError(w, http.StatusUnauthorized, "Missing X-API-Key header")
        return
    }
    _, err := h.stores.APIKeys.VerifyAndTouch(apiKey)
    if err != nil {
        respondError(w, http.StatusUnauthorized, "Invalid API key")
        return
    }

    var payload map[string]interface{}
    if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
        respondError(w, http.StatusBadRequest, "Invalid JSON body")
        return
    }

    // TODO: store metrics securely (out of scope for initial implementation)
    respondJSON(w, http.StatusOK, map[string]string{"status": "received"})
}

