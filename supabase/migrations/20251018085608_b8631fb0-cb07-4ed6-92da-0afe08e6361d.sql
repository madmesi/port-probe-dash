-- Add approved status to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Update existing profiles to be approved
UPDATE public.profiles SET approved = true WHERE approved IS NULL OR approved = false;

-- Update RLS policies to check approval status
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view permitted servers" ON public.servers;
CREATE POLICY "Users can view permitted servers" ON public.servers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.approved = true
    )
    AND EXISTS (
      SELECT 1 FROM public.user_server_permissions
      WHERE user_id = auth.uid() AND server_id = servers.id
    )
  );

-- Only approved admins can manage things
CREATE POLICY "Only approved admins can view all groups" ON public.server_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.approved = true
    )
    OR has_role(auth.uid(), 'admin')
  );

-- Admins can approve users
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));