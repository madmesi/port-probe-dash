-- Create SSL certificates table
CREATE TABLE public.ssl_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  issuer TEXT,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ssl_certificates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all SSL certificates"
ON public.ssl_certificates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view SSL certificates for permitted servers"
ON public.ssl_certificates
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() AND p.approved = true
  )
  AND EXISTS (
    SELECT 1
    FROM user_server_permissions
    WHERE user_server_permissions.user_id = auth.uid()
    AND user_server_permissions.server_id = ssl_certificates.server_id
  )
);

-- Create index for faster queries
CREATE INDEX idx_ssl_certificates_server_id ON public.ssl_certificates(server_id);
CREATE INDEX idx_ssl_certificates_expires_at ON public.ssl_certificates(expires_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ssl_certificates_updated_at
BEFORE UPDATE ON public.ssl_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();