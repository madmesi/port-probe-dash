-- Add the 'tags' column to the 'servers' table
ALTER TABLE servers
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Optional: Add an index to the tags column for faster querying if tags are frequently searched
CREATE INDEX idx_servers_tags ON servers USING GIN (tags);