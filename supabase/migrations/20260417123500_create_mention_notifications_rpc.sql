CREATE OR REPLACE FUNCTION public.create_mention_notifications(
  _sender_name text,
  _room_slug text,
  _body text,
  _mentioned_user_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _notify_everyone boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  preview text := left(COALESCE(_body, ''), 80);
  target_user_id uuid;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF length(COALESCE(_body, '')) > 80 THEN
    preview := preview || '…';
  END IF;

  IF _notify_everyone THEN
    IF NOT (public.is_academy_ceo(caller_id) OR public.has_role(caller_id, 'operator'::public.app_role)) THEN
      RAISE EXCEPTION 'Only operators can notify everyone';
    END IF;

    INSERT INTO public.academy_notifications (user_id, type, title, body, link_path)
    VALUES (
      NULL,
      'mention',
      COALESCE(NULLIF(trim(_sender_name), ''), 'Someone') || ' mentioned @everyone in #' || COALESCE(NULLIF(trim(_room_slug), ''), 'community'),
      preview,
      '/academy/community'
    );
  END IF;

  FOREACH target_user_id IN ARRAY COALESCE(_mentioned_user_ids, ARRAY[]::uuid[]) LOOP
    IF target_user_id IS NULL OR target_user_id = caller_id THEN
      CONTINUE;
    END IF;

    INSERT INTO public.academy_notifications (user_id, type, title, body, link_path)
    VALUES (
      target_user_id,
      'mention',
      COALESCE(NULLIF(trim(_sender_name), ''), 'Someone') || ' mentioned you in #' || COALESCE(NULLIF(trim(_room_slug), ''), 'community'),
      preview,
      '/academy/community'
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_mention_notifications(text, text, text, uuid[], boolean) TO authenticated;
