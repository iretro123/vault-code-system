CREATE OR REPLACE FUNCTION public.get_recent_activity()
RETURNS TABLE (
  activity_id text,
  user_id uuid,
  activity_type text,
  activity_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  (SELECT 'c-' || id::text, user_id, 'call'::text, clicked_at
   FROM live_session_attendance
   WHERE clicked_at >= now() - interval '7 days'
   ORDER BY clicked_at DESC LIMIT 5)
  UNION ALL
  (SELECT 'j-' || id::text, user_id, 'journal'::text, created_at
   FROM journal_entries
   WHERE created_at >= now() - interval '7 days'
   ORDER BY created_at DESC LIMIT 5)
  UNION ALL
  (SELECT 'l-' || id::text, user_id, 'lesson'::text, completed_at
   FROM lesson_progress
   WHERE completed = true AND completed_at >= now() - interval '7 days'
   ORDER BY completed_at DESC LIMIT 5)
$$;