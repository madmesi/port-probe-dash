-- Add tags column to servers table
ALTER TABLE servers ADD COLUMN tags text[] DEFAULT '{}';

-- Add index for faster tag queries
CREATE INDEX idx_servers_tags ON servers USING GIN(tags);