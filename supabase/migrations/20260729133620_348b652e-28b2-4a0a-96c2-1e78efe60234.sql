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

REVOKE ALL ON FUNCTION public.unregister_device_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unregister_device_token(text) TO authenticated;