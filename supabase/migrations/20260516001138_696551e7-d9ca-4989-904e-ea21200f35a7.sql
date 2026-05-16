CREATE TABLE IF NOT EXISTS public.notification_push_dispatches (
  notification_id uuid PRIMARY KEY REFERENCES public.academy_notifications(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz NULL,
  sent_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.notification_push_dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct access to notification push dispatches" ON public.notification_push_dispatches;
CREATE POLICY "No direct access to notification push dispatches" ON public.notification_push_dispatches FOR ALL TO authenticated USING (false) WITH CHECK (false);
DROP TRIGGER IF EXISTS academy_notifications_push_notify ON public.academy_notifications;