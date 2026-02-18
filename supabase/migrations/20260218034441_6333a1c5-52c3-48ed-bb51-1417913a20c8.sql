
-- Store broadcast messages (drafts + sent history)
CREATE TABLE public.broadcast_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'motivation_ping',
  -- 'motivation_ping' | 'broadcast'
  channel text NOT NULL DEFAULT 'in_app',
  -- 'in_app' | 'email' | 'sms'
  recipient_type text NOT NULL DEFAULT 'all',
  -- 'all' | 'single'
  recipient_user_id uuid,
  -- null = all users
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  template_key text,
  -- e.g. 'daily_reminder', 'new_module', etc.
  status text NOT NULL DEFAULT 'sent',
  -- 'draft' | 'sent' | 'failed'
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone
);

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can read broadcast messages"
  ON public.broadcast_messages
  FOR SELECT
  TO authenticated
  USING (has_academy_permission(auth.uid(), 'manage_notifications'));

CREATE POLICY "Admins can insert broadcast messages"
  ON public.broadcast_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (has_academy_permission(auth.uid(), 'manage_notifications'));

CREATE POLICY "Admins can update broadcast messages"
  ON public.broadcast_messages
  FOR UPDATE
  TO authenticated
  USING (has_academy_permission(auth.uid(), 'manage_notifications'));

CREATE POLICY "Admins can delete broadcast messages"
  ON public.broadcast_messages
  FOR DELETE
  TO authenticated
  USING (has_academy_permission(auth.uid(), 'manage_notifications'));

CREATE INDEX idx_broadcast_messages_created ON public.broadcast_messages(created_at DESC);
