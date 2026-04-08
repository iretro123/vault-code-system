-- Remove blanket read-all profiles policy (own-profile policy already exists)
DROP POLICY IF EXISTS "Authenticated can read all profiles" ON public.profiles;

-- Fix live_sessions: restrict from public to authenticated
DROP POLICY IF EXISTS "Anyone can read live sessions" ON public.live_sessions;

CREATE POLICY "Authenticated can read live sessions"
ON public.live_sessions FOR SELECT TO authenticated
USING (true);