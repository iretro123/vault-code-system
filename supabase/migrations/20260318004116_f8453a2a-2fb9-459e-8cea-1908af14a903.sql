
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS live_notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_live_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row record;
BEGIN
  FOR row IN
    SELECT id, title, description
    FROM public.live_sessions
    WHERE status = 'scheduled'
      AND is_replay = false
      AND session_type = 'live'
      AND live_notified_at IS NULL
      AND session_date <= now()
      AND session_date > now() - interval '10 minutes'
  LOOP
    INSERT INTO public.academy_notifications (user_id, type, title, body, link_path)
    VALUES (
      NULL,
      'live_now',
      '🔴 RZ is live: ' || row.title,
      COALESCE(NULLIF(row.description, ''), 'Live session is starting now. Tap to join.'),
      '/academy/live'
    );

    UPDATE public.live_sessions
      SET live_notified_at = now()
      WHERE id = row.id;
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'notify-live-sessions',
  '* * * * *',
  'SELECT public.notify_live_sessions()'
);
