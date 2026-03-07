
-- 1) Create dm_threads table
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid,
  inbox_item_id uuid REFERENCES public.inbox_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

-- Users can see own threads
CREATE POLICY "Users can read own dm threads"
  ON public.dm_threads FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'operator'::app_role)
    OR has_academy_permission(auth.uid(), 'manage_notifications'::text)
  );

-- Users can insert threads for themselves
CREATE POLICY "Users can create own dm threads"
  ON public.dm_threads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Operators can insert threads for any user
CREATE POLICY "Operators can create dm threads"
  ON public.dm_threads FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'operator'::app_role)
    OR has_academy_permission(auth.uid(), 'manage_notifications'::text)
  );

-- Update last_message_at
CREATE POLICY "Participants can update dm threads"
  ON public.dm_threads FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'operator'::app_role)
    OR has_academy_permission(auth.uid(), 'manage_notifications'::text)
  );

-- 2) Create dm_messages table
CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- Read: thread participant or operator
CREATE POLICY "Participants can read dm messages"
  ON public.dm_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_threads t
      WHERE t.id = thread_id
      AND (t.user_id = auth.uid()
           OR has_role(auth.uid(), 'operator'::app_role)
           OR has_academy_permission(auth.uid(), 'manage_notifications'::text))
    )
  );

-- Insert: sender must be participant
CREATE POLICY "Participants can send dm messages"
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.dm_threads t
      WHERE t.id = thread_id
      AND (t.user_id = auth.uid()
           OR has_role(auth.uid(), 'operator'::app_role)
           OR has_academy_permission(auth.uid(), 'manage_notifications'::text))
    )
  );

-- Update read_at
CREATE POLICY "Participants can update dm messages"
  ON public.dm_messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_threads t
      WHERE t.id = thread_id
      AND (t.user_id = auth.uid()
           OR has_role(auth.uid(), 'operator'::app_role)
           OR has_academy_permission(auth.uid(), 'manage_notifications'::text))
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;

-- Index for performance
CREATE INDEX idx_dm_messages_thread_id ON public.dm_messages(thread_id);
CREATE INDEX idx_dm_threads_user_id ON public.dm_threads(user_id);
