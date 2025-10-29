# SSL Certificate Monitoring

This application provides comprehensive SSL certificate monitoring with alerting capabilities.

## Features

### 1. SSL Certificate Management
- Add SSL certificates via file upload or paste
- Auto-parse certificate details (domain, issuer, expiration)
- Associate certificates with servers
- Enable/disable auto-renewal

### 2. Visual Status Dashboard
- Color-coded expiration status:
  - 🟢 Green: >60 days remaining
  - 🔵 Blue: 31-60 days remaining
  - 🟠 Orange: 8-30 days remaining
  - 🔴 Red: ≤7 days or expired
- Status overview cards showing count of valid, expiring, critical, and expired certificates

### 3. Pop-up Notifications
- Automatic notifications when users log in
- Alerts for expired certificates (highest priority)
- Alerts for critical certificates (expiring in 7 days or less)
- Summary alerts for warning certificates (expiring in 30 days or less)
- Periodic checks every 30 minutes while logged in

### 4. Prometheus Integration
The application exposes Prometheus-compatible metrics at `/metrics` endpoint.

#### Available Metrics

```prometheus
# Days until SSL certificate expires
ssl_certificate_expiry_days{domain="example.com",issuer="Let's Encrypt",server_id="uuid"} 45.2

# SSL certificate auto-renew status (1=enabled, 0=disabled)
ssl_certificate_auto_renew{domain="example.com",server_id="uuid"} 1
```

#### Prometheus Configuration

Add the following to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'ssl_certificates'
    static_configs:
      - targets: ['your-app-url:port']
    metrics_path: '/metrics'
    scrape_interval: 5m
```

#### Example Alerting Rules

Create alerting rules in Prometheus:

```yaml
groups:
  - name: ssl_certificates
    interval: 5m
    rules:
      - alert: SSLCertificateExpiringSoon
        expr: ssl_certificate_expiry_days < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL Certificate expiring soon"
          description: "Certificate for {{ $labels.domain }} expires in {{ $value }} days"
      
      - alert: SSLCertificateCritical
        expr: ssl_certificate_expiry_days < 7
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "SSL Certificate expiring very soon"
          description: "Certificate for {{ $labels.domain }} expires in {{ $value }} days"
      
      - alert: SSLCertificateExpired
        expr: ssl_certificate_expiry_days < 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "SSL Certificate EXPIRED"
          description: "Certificate for {{ $labels.domain }} has been expired for {{ $value | abs }} days"
```

### 5. Alertmanager Integration

#### Manual Alert Sending
Use the "Send Alerts to Alertmanager" button in the SSL Management panel to manually push alerts.

1. Click the button in the SSL Certificates tab
2. Enter your Alertmanager URL (e.g., `http://alertmanager:9093`)
3. Click "Send Alerts"

The system will send alerts for:
- Expired certificates (severity: critical)
- Certificates expiring in ≤7 days (severity: critical)
- Certificates expiring in ≤30 days (severity: warning)

#### Automated Alert Pushing
To automate alert pushing, you can create a cron job or scheduled task that calls the API endpoint:

```bash
curl -X POST http://your-app-url/api/ssl-certificates/send-alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"alertmanager_url": "http://alertmanager:9093"}'
```

#### Alert Format
Alerts are sent in Alertmanager-compatible format:

```json
[
  {
    "labels": {
      "alertname": "SSLCertificateExpiring",
      "severity": "critical",
      "domain": "example.com",
      "issuer": "Let's Encrypt",
      "server_id": "uuid"
    },
    "annotations": {
      "summary": "SSL certificate for example.com expires in 5 days",
      "description": "Certificate issued by Let's Encrypt expires at 2025-11-01 00:00:00"
    },
    "startsAt": "2025-10-27T10:00:00Z"
  }
]
```

## Adding SSL Certificates

1. Navigate to the SSL Certificates tab
2. Click "Add SSL Certificate"
3. Choose one of two methods:

### Method 1: File Upload
- Upload `.crt` or `.pem` certificate file
- Optionally upload private key file
- System auto-parses certificate details

### Method 2: Paste Content
- Paste certificate content directly
- System auto-parses certificate details

4. Verify/edit auto-detected information:
   - Domain
   - Issuer
   - Issue and expiration dates
5. Select associated server
6. Enable auto-renewal if desired
7. Click "Add Certificate"

## Viewing Certificate Status

The SSL Certificates tab shows:
- Status overview cards (Valid, Expiring Soon, Critical, Expired)
- Individual certificate cards with:
  - Domain and server information
  - Visual status indicator
  - Days until expiration
  - Issue and expiration dates
  - Auto-renewal status
  - Certificate issuer

Certificates are automatically sorted by expiration date (soonest first).

## Monitoring Best Practices

1. **Enable Pop-up Notifications**: Keep users informed of critical expirations
2. **Set up Prometheus Scraping**: Continuous monitoring of all certificates
3. **Configure Alertmanager**: Receive alerts via email, Slack, PagerDuty, etc.
4. **Enable Auto-renewal**: Where supported, enable auto-renewal for certificates
5. **Regular Reviews**: Periodically review the SSL dashboard for upcoming expirations
6. **Alert Routing**: Configure Alertmanager to route critical alerts to on-call teams

## API Endpoints

- `GET /metrics` - Prometheus metrics (public)
- `GET /api/ssl-certificates` - List all certificates
- `POST /api/ssl-certificates` - Create new certificate
- `GET /api/ssl-certificates/{id}` - Get certificate details
- `PUT /api/ssl-certificates/{id}` - Update certificate
- `DELETE /api/ssl-certificates/{id}` - Delete certificate
- `POST /api/ssl-certificates/send-alerts` - Send alerts to Alertmanager (admin only)

## Security

- Only administrators can add, update, or delete SSL certificates
- Regular users can view certificates for servers they have permission to access
- Alertmanager integration requires admin privileges
- Prometheus metrics endpoint is public (for scraping)
