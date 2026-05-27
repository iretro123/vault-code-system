
CREATE OR REPLACE VIEW public.live_sessions_public
WITH (security_invoker = on) AS
SELECT id, title, description, session_date, session_type, duration_minutes, status, is_replay
FROM public.live_sessions
WHERE is_replay = false
  AND session_date >= now();

GRANT SELECT ON public.live_sessions_public TO anon, authenticated;

-- View runs with caller's privileges; allow anon to SELECT only the safe columns
-- of the base table via a column-bounded policy used by the view.
DROP POLICY IF EXISTS "Anyone can read upcoming live sessions (safe view)" ON public.live_sessions;
CREATE POLICY "Anyone can read upcoming live sessions (safe view)"
ON public.live_sessions
FOR SELECT
TO anon
USING (is_replay = false AND session_date >= now());

GRANT SELECT (id, title, description, session_date, session_type, duration_minutes, status, is_replay)
ON public.live_sessions TO anon;
