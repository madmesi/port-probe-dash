-- Create API keys table for server-to-server authentication
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API keys
CREATE POLICY "Only admins can manage API keys"
ON public.api_keys
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON public.api_keys(is_active);

-- Create table for network data uploads
CREATE TABLE IF NOT EXISTS public.network_data_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('tcpdump', 'lsof', 'netstat')),
  file_size INTEGER NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  parsed_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.network_data_uploads ENABLE ROW LEVEL SECURITY;

-- Admins can manage all uploads
CREATE POLICY "Admins can manage all uploads"
ON public.network_data_uploads
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own uploads for permitted servers
CREATE POLICY "Users can view own uploads for permitted servers"
ON public.network_data_uploads
FOR SELECT
USING (
  uploaded_by = auth.uid() OR
  (EXISTS (
    SELECT 1 FROM user_server_permissions
    WHERE user_id = auth.uid() AND server_id = network_data_uploads.server_id
  ))
);

-- Create indexes
CREATE INDEX idx_network_data_uploads_server_id ON public.network_data_uploads(server_id);
CREATE INDEX idx_network_data_uploads_uploaded_by ON public.network_data_uploads(uploaded_by);
CREATE INDEX idx_network_data_uploads_processed ON public.network_data_uploads(processed);