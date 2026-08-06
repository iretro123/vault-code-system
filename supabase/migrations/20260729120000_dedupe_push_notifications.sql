-- Tighten push notification delivery so one message creates one push per
-- physical device, even after users switch between guest/free/paid/admin.

CREATE OR REPLACE FUNCTION public.register_device_token(
  _token text,
  _platform text DEFAULT 'unknown'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  normalized_token text := NULLIF(BTRIM(COALESCE(_token, '')), '');
  normalized_platform text := COALESCE(NULLIF(BTRIM(COALESCE(_platform, '')), ''), 'unknown');
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF normalized_token IS NULL THEN
    RAISE EXCEPTION 'Device token required';
  END IF;

  -- Move this APNs/FCM token to the current user.
  DELETE FROM public.device_tokens
  WHERE token = normalized_token
    AND user_id <> caller_id;

  -- Move this logical install/device to the current user too. This catches
  -- older APNs rows for the same phone whose token changed after reinstall.
  DELETE FROM public.device_tokens
  WHERE platform = normalized_platform
    AND user_id <> caller_id;

  INSERT INTO public.device_tokens (user_id, token, platform, last_seen_at, updated_at)
  VALUES (caller_id, normalized_token, normalized_platform, now(), now())
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        last_seen_at = now(),
        updated_at = now();

  DELETE FROM public.device_tokens
  WHERE user_id = caller_id
    AND platform = normalized_platform
    AND token <> normalized_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_device_token(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.unregister_device_token(
  _platform text DEFAULT 'unknown'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  normalized_platform text := COALESCE(NULLIF(BTRIM(COALESCE(_platform, '')), ''), 'unknown');
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.device_tokens
  WHERE user_id = caller_id
    AND platform = normalized_platform;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unregister_device_token(text) TO authenticated;

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

    -- @everyone is already a broadcast. Do not also create per-user mention
    -- rows for the same message, or recipients can see duplicate pushes.
    RETURN;
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

CREATE OR REPLACE FUNCTION public.notify_ceo_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snippet text;
BEGIN
  IF NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_academy_ceo(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- @everyone is handled by create_mention_notifications as one broadcast.
  IF POSITION('@everyone' IN LOWER(COALESCE(NEW.body, ''))) > 0 THEN
    RETURN NEW;
  END IF;

  -- Signal/watchlist posts have their own paid-only push trigger. Do not also
  -- create a general CEO broadcast for the same signal message.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(NEW.attachments, '[]'::jsonb)) AS attachment
    WHERE attachment->>'type' IN ('signal-watchlist', 'signal-live')
  ) THEN
    RETURN NEW;
  END IF;

  snippet := COALESCE(NEW.body, '');
  IF length(snippet) > 140 THEN
    snippet := left(snippet, 140) || '…';
  END IF;

  INSERT INTO public.academy_notifications (user_id, type, title, body, link_path)
  VALUES (
    NULL,
    'rz_message',
    NEW.user_name || ' posted in #' || NEW.room_slug,
    snippet,
    '/academy/community'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_messages_ceo_notify ON public.academy_messages;
CREATE TRIGGER academy_messages_ceo_notify
AFTER INSERT ON public.academy_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_ceo_message();

-- Leave only the current push webhook trigger active.
DROP TRIGGER IF EXISTS academy_notifications_push_notify ON public.academy_notifications;

-- Clean historical duplicate token rows if production has drifted.
DELETE FROM public.device_tokens dt
USING (
  SELECT ctid, row_number() OVER (
    PARTITION BY token
    ORDER BY last_seen_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  ) AS rn
  FROM public.device_tokens
) dup
WHERE dt.ctid = dup.ctid
  AND dup.rn > 1;

DELETE FROM public.device_tokens dt
USING (
  SELECT ctid, row_number() OVER (
    PARTITION BY platform
    ORDER BY last_seen_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  ) AS rn
  FROM public.device_tokens
  WHERE platform LIKE '%:%'
) dup
WHERE dt.ctid = dup.ctid
  AND dup.rn > 1;
