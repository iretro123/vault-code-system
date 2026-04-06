
DROP FUNCTION IF EXISTS public.get_recent_activity();

CREATE FUNCTION public.get_recent_activity()
RETURNS TABLE(activity_id text, user_id uuid, activity_type text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  (SELECT 'c-' || id::text, user_id, 'call'::text, clicked_at
   FROM live_session_attendance
   WHERE clicked_at >= now() - interval '30 days'
   ORDER BY clicked_at DESC LIMIT 5)
  UNION ALL
  (SELECT 'j-' || id::text, user_id, 'journal'::text, created_at
   FROM journal_entries
   WHERE created_at >= now() - interval '30 days'
   ORDER BY created_at DESC LIMIT 5)
  UNION ALL
  (SELECT 'l-' || lp.id::text, lp.user_id, 'lesson'::text, lp.completed_at
   FROM lesson_progress lp
   WHERE lp.completed = true AND lp.completed_at >= now() - interval '30 days'
   ORDER BY lp.completed_at DESC LIMIT 5)
  UNION ALL
  (SELECT 'w-' || id::text, user_id, 'win'::text, created_at
   FROM academy_messages
   WHERE room_slug = 'wins' AND is_deleted = false AND created_at >= now() - interval '30 days'
   ORDER BY created_at DESC LIMIT 5)
$$;
