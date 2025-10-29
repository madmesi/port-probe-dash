-- Fix 1: Restrict user_roles visibility to own roles or admins only
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" 
ON public.user_roles
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: Create a safe view for non-admin server access (only expose safe fields)
CREATE OR REPLACE VIEW public.servers_safe AS
SELECT 
  id,
  hostname,
  status,
  group_id,
  created_at,
  updated_at
FROM public.servers;

-- Grant access to the safe view for authenticated users
GRANT SELECT ON public.servers_safe TO authenticated;

-- Add RLS policy for the safe view
ALTER VIEW public.servers_safe SET (security_invoker = true);

-- Create a policy that allows users to see only their permitted servers through the safe view
CREATE POLICY "Users can view permitted servers safely"
ON public.servers
FOR SELECT
USING (
  (EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.approved = true
  )) AND (EXISTS (
    SELECT 1
    FROM public.user_server_permissions
    WHERE user_server_permissions.user_id = auth.uid()
    AND user_server_permissions.server_id = servers.id
  ))
);