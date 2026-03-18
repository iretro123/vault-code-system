-- Enable push notifications for live-now notifications
CREATE OR REPLACE FUNCTION public.push_notify_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  url text;
  secret text;
BEGIN
  IF NEW.type NOT IN ('mention', 'rz_message', 'live_now') THEN
    RETURN NEW;
  END IF;

  url := current_setting('app.settings.push_webhook_url', true);
  secret := current_setting('app.settings.push_webhook_secret', true);

  IF url IS NULL OR url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-push-secret', COALESCE(secret, '')
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
END;
$$;
