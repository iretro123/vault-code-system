-- Lock down backend exposures that were blocking production publish.

-- 1. Remove public live session join URLs from anon-safe access.
CREATE OR REPLACE VIEW public.live_sessions_public
WITH (security_invoker = on) AS
SELECT id, title, description, session_date, session_type, duration_minutes, status, is_replay
FROM public.live_sessions
WHERE is_replay = false
  AND session_date >= now();

GRANT SELECT ON public.live_sessions_public TO anon, authenticated;
REVOKE SELECT (join_url) ON public.live_sessions FROM anon;
GRANT SELECT (id, title, description, session_date, session_type, duration_minutes, status, is_replay)
ON public.live_sessions TO anon;

-- 2. Make sensitive screenshot buckets private and readable only by the owner or operators.
UPDATE storage.buckets
SET public = false
WHERE id IN ('ticket-screenshots', 'trade-screenshots');

DROP POLICY IF EXISTS "Anyone can view screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public read trade screenshots" ON storage.objects;

CREATE POLICY "Users can read own ticket screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-screenshots'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'operator'::app_role)
  )
);

CREATE POLICY "Users can delete own ticket screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-screenshots'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'operator'::app_role)
  )
);

CREATE POLICY "Users can read own trade screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'trade-screenshots'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'operator'::app_role)
  )
);

-- 3. Require authenticated Realtime topic access instead of public topic joins.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated users can receive realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
