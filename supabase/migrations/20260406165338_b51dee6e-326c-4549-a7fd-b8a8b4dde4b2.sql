
DROP FUNCTION IF EXISTS public.get_recent_activity();

CREATE FUNCTION public.get_recent_activity()
RETURNS TABLE(activity_id text, user_id uuid, activity_type text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sub.aid, sub.uid, sub.atype, sub.ts FROM (
    (SELECT 'c-' || id::text AS aid, user_id AS uid, 'call'::text AS atype, clicked_at AS ts
     FROM live_session_attendance
     WHERE clicked_at >= now() - interval '30 days'
     ORDER BY clicked_at DESC LIMIT 10)
    UNION ALL
    (SELECT 'j-' || id::text AS aid, user_id AS uid, 'journal'::text AS atype, created_at AS ts
     FROM journal_entries
     WHERE created_at >= now() - interval '30 days'
     ORDER BY created_at DESC LIMIT 10)
    UNION ALL
    (SELECT 'l-' || lp.id::text AS aid, lp.user_id AS uid, 'lesson'::text AS atype, lp.completed_at AS ts
     FROM lesson_progress lp
     WHERE lp.completed = true AND lp.completed_at >= now() - interval '30 days'
     ORDER BY lp.completed_at DESC LIMIT 10)
    UNION ALL
    (SELECT 'w-' || id::text AS aid, user_id AS uid, 'win'::text AS atype, created_at AS ts
     FROM academy_messages
     WHERE room_slug = 'wins' AND is_deleted = false AND created_at >= now() - interval '30 days'
     ORDER BY created_at DESC LIMIT 10)
  ) AS sub
  ORDER BY sub.ts DESC;
$$;
