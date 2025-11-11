-- SSL certificates table
CREATE TABLE IF NOT EXISTS ssl_certificates (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id VARCHAR(36) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    issuer TEXT,
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_server_id ON ssl_certificates(server_id);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_domain ON ssl_certificates(domain);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_expires_at ON ssl_certificates(expires_at);

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_ssl_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ssl_certificates_updated_at ON ssl_certificates;
CREATE TRIGGER update_ssl_certificates_updated_at BEFORE UPDATE ON ssl_certificates
    FOR EACH ROW EXECUTE FUNCTION update_ssl_updated_at_column();


