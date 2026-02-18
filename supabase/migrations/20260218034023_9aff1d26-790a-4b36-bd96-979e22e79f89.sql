
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins with view_admin_panel permission can read logs
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (has_academy_permission(auth.uid(), 'view_admin_panel'));

-- Any authenticated user with manage_users can insert (server-side action)
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (has_academy_permission(auth.uid(), 'manage_users'));

-- Add banned column to profiles for ban functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Add index for fast lookups
CREATE INDEX idx_audit_logs_target ON public.audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_admin ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
