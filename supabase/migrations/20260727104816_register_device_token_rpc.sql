-- Safely bind the current device token to the currently authenticated user.
--
-- Why this exists:
-- APNs/FCM tokens are device-install scoped, not account scoped. A user can enter
-- as the shared guest account first, then create/sign into a real basic account
-- on the same phone. A direct client-side upsert on device_tokens(token) can fail
-- under RLS because the existing row belongs to the previous auth user. This
-- SECURITY DEFINER function reassigns only the submitted token to auth.uid().
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

  -- If the same physical install was previously used by guest or another
  -- account, move that token to the current user so targeted notifications work.
  DELETE FROM public.device_tokens
  WHERE token = normalized_token
    AND user_id <> caller_id;

  INSERT INTO public.device_tokens (user_id, token, platform, last_seen_at, updated_at)
  VALUES (caller_id, normalized_token, normalized_platform, now(), now())
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        last_seen_at = now(),
        updated_at = now();

  -- Keep one token per logical device/platform for this account to prevent
  -- duplicate pushes from stale APNs rows after reinstalls or account switches.
  DELETE FROM public.device_tokens
  WHERE user_id = caller_id
    AND platform = normalized_platform
    AND token <> normalized_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_device_token(text, text) TO authenticated;
