package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/cmdb/backend/internal/auth"
)

func strPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// PrometheusMetrics returns SSL certificate metrics in Prometheus format
func (h *Handlers) PrometheusMetrics(w http.ResponseWriter, r *http.Request) {
	certificates, err := h.stores.SSL.List("", true)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch certificates")
		return
	}

	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	
	fmt.Fprintf(w, "# HELP ssl_certificate_expiry_days Days until SSL certificate expires\n")
	fmt.Fprintf(w, "# TYPE ssl_certificate_expiry_days gauge\n")

	now := time.Now()
	for _, cert := range certificates {
		daysUntilExpiry := cert.ExpiresAt.Sub(now).Hours() / 24
		
		fmt.Fprintf(w, "ssl_certificate_expiry_days{domain=\"%s\",issuer=\"%s\",server_id=\"%s\"} %.2f\n",
			cert.Domain, strPtr(cert.Issuer), cert.ServerID, daysUntilExpiry)
	}

	fmt.Fprintf(w, "\n# HELP ssl_certificate_auto_renew SSL certificate auto-renew status (1=enabled, 0=disabled)\n")
	fmt.Fprintf(w, "# TYPE ssl_certificate_auto_renew gauge\n")
	
	for _, cert := range certificates {
		autoRenew := 0
		if cert.AutoRenew {
			autoRenew = 1
		}
		fmt.Fprintf(w, "ssl_certificate_auto_renew{domain=\"%s\",server_id=\"%s\"} %d\n",
			cert.Domain, cert.ServerID, autoRenew)
	}
}

// AlertmanagerWebhook sends SSL certificate alerts to Alertmanager
type AlertmanagerAlert struct {
	Labels      map[string]string `json:"labels"`
	Annotations map[string]string `json:"annotations"`
	StartsAt    time.Time         `json:"startsAt"`
	EndsAt      time.Time         `json:"endsAt,omitempty"`
}

func (h *Handlers) SendAlertsToAlertmanager(w http.ResponseWriter, r *http.Request) {
	userID := auth.GetUserID(r.Context())
	isAdmin, _ := h.stores.Users.HasRole(userID, "admin")

	if !isAdmin {
		respondError(w, http.StatusForbidden, "Admin access required")
		return
	}

	var req struct {
		AlertmanagerURL string `json:"alertmanager_url"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.AlertmanagerURL == "" {
		respondError(w, http.StatusBadRequest, "alertmanager_url is required")
		return
	}

	certificates, err := h.stores.SSL.List(userID, isAdmin)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch certificates")
		return
	}

	now := time.Now()
	var alerts []AlertmanagerAlert

	for _, cert := range certificates {
		daysUntilExpiry := int(cert.ExpiresAt.Sub(now).Hours() / 24)
		
		var severity string
		var message string
		
		if daysUntilExpiry < 0 {
			severity = "critical"
			message = fmt.Sprintf("SSL certificate for %s has EXPIRED", cert.Domain)
		} else if daysUntilExpiry <= 7 {
			severity = "critical"
			message = fmt.Sprintf("SSL certificate for %s expires in %d days", cert.Domain, daysUntilExpiry)
		} else if daysUntilExpiry <= 30 {
			severity = "warning"
			message = fmt.Sprintf("SSL certificate for %s expires in %d days", cert.Domain, daysUntilExpiry)
		} else {
			continue // Skip valid certificates
		}

		alert := AlertmanagerAlert{
			Labels: map[string]string{
				"alertname": "SSLCertificateExpiring",
				"severity":  severity,
				"domain":    cert.Domain,
				"issuer":    strPtr(cert.Issuer),
				"server_id": cert.ServerID,
			},
			Annotations: map[string]string{
				"summary":     message,
				"description": fmt.Sprintf("Certificate issued by %s expires at %s", strPtr(cert.Issuer), cert.ExpiresAt.Format("2006-01-02 15:04:05")),
			},
			StartsAt: now,
		}

		alerts = append(alerts, alert)
	}

	if len(alerts) == 0 {
		respondJSON(w, http.StatusOK, map[string]string{
			"message": "No expiring certificates found",
			"sent":    "0",
		})
		return
	}

	// Send to Alertmanager
	alertsJSON, err := json.Marshal(alerts)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to marshal alerts")
		return
	}

	alertmanagerURL := req.AlertmanagerURL + "/api/v1/alerts"
	resp, err := http.Post(alertmanagerURL, "application/json", bytes.NewBuffer(alertsJSON))
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to send alerts: %v", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("Alertmanager returned status: %d", resp.StatusCode))
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Alerts sent successfully",
		"sent":    len(alerts),
		"alerts":  alerts,
	})
}
