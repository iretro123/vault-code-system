CREATE OR REPLACE VIEW public.live_sessions_public
WITH (security_invoker = on) AS
SELECT id, title, description, session_date, session_type, duration_minutes, status, is_replay, join_url
FROM public.live_sessions
WHERE is_replay = false
  AND session_date >= now();

GRANT SELECT ON public.live_sessions_public TO anon, authenticated;

GRANT SELECT (id, title, description, session_date, session_type, duration_minutes, status, is_replay, join_url)
ON public.live_sessions TO anon;