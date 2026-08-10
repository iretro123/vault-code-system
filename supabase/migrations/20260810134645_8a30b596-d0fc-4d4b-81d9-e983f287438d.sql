DROP POLICY IF EXISTS "Anyone can read upcoming live sessions (safe view)" ON public.live_sessions;
REVOKE SELECT ON public.live_sessions FROM anon;