
-- 1) register_device_token: stricter dedupe across users AND same-device platform key
CREATE OR REPLACE FUNCTION public.register_device_token(_token text, _platform text DEFAULT 'unknown'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Same token owned by any other user -> remove
  DELETE FROM public.device_tokens
  WHERE token = normalized_token
    AND user_id <> caller_id;

  -- Same normalized platform (e.g. ios:<deviceId>) owned by another user -> remove.
  -- This ensures one physical device doesn't get pushes for multiple accounts.
  IF POSITION(':' IN normalized_platform) > 0 THEN
    DELETE FROM public.device_tokens
    WHERE platform = normalized_platform
      AND user_id <> caller_id;
  END IF;

  -- Upsert this token to current user
  INSERT INTO public.device_tokens (user_id, token, platform, last_seen_at, updated_at)
  VALUES (caller_id, normalized_token, normalized_platform, now(), now())
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        last_seen_at = now(),
        updated_at = now();

  -- Remove other tokens for the same current user + platform
  DELETE FROM public.device_tokens
  WHERE user_id = caller_id
    AND platform = normalized_platform
    AND token <> normalized_token;
END;
$function$;

-- 2) create_mention_notifications: @everyone => single broadcast row, return immediately
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
SET search_path TO 'public'
AS $function$
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

    -- Skip per-user rows for @everyone to prevent duplicate pushes
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
$function$;

-- 3) notify_ceo_message: skip @everyone and signal attachments to avoid duplicate pushes
CREATE OR REPLACE FUNCTION public.notify_ceo_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  snippet text;
BEGIN
  IF NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_academy_ceo(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- @everyone is handled by mention broadcast
  IF POSITION('@everyone' IN LOWER(COALESCE(NEW.body, ''))) > 0 THEN
    RETURN NEW;
  END IF;

  -- Signal attachments are handled by notify_guest_signal_message
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
$function$;

-- 4) notify_guest_signal_message stays paid/internal-only (unchanged shape, re-affirmed)
-- (Already correct: fans out per-user, never NULL broadcast, respects role gating.)

-- 5) Drop legacy trigger if it exists (kept push_notify_on_insert)
DROP TRIGGER IF EXISTS academy_notifications_push_notify ON public.academy_notifications;

-- 7) Clean existing duplicate device_tokens rows
-- Keep newest row per exact token
WITH ranked AS (
  SELECT ctid,
    ROW_NUMBER() OVER (PARTITION BY token ORDER BY last_seen_at DESC NULLS LAST, updated_at DESC NULLS LAST) AS rn
  FROM public.device_tokens
)
DELETE FROM public.device_tokens dt
USING ranked r
WHERE dt.ctid = r.ctid AND r.rn > 1;

-- Keep newest row per platform when platform contains ':' (device-scoped key)
WITH ranked AS (
  SELECT ctid,
    ROW_NUMBER() OVER (PARTITION BY platform ORDER BY last_seen_at DESC NULLS LAST, updated_at DESC NULLS LAST) AS rn
  FROM public.device_tokens
  WHERE POSITION(':' IN platform) > 0
)
DELETE FROM public.device_tokens dt
USING ranked r
WHERE dt.ctid = r.ctid AND r.rn > 1;
