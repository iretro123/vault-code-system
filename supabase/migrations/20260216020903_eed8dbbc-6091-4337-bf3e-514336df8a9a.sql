
-- Academy notifications table
CREATE TABLE public.academy_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT NULL,  -- NULL = broadcast to all users
  type text NOT NULL DEFAULT 'announcement',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link_path text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reads tracking (works for both targeted and broadcast)
CREATE TABLE public.academy_notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.academy_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.academy_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_notification_reads ENABLE ROW LEVEL SECURITY;

-- Notifications: users can read their own targeted + all broadcasts
CREATE POLICY "Users can read own or broadcast notifications"
ON public.academy_notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- Only operators can insert notifications
CREATE POLICY "Operators can insert notifications"
ON public.academy_notifications FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'operator'::app_role));

-- Only operators can delete notifications
CREATE POLICY "Operators can delete notifications"
ON public.academy_notifications FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role));

-- Reads: users can read own reads
CREATE POLICY "Users can read own notification reads"
ON public.academy_notification_reads FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can mark notifications as read
CREATE POLICY "Users can insert own notification reads"
ON public.academy_notification_reads FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
