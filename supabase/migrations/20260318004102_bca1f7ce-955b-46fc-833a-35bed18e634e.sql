
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'unknown',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_token_key ON public.device_tokens(token);
CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON public.device_tokens(user_id);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their device tokens"
  ON public.device_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

  IF public.is_academy_ceo(NEW.user_id) THEN
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_messages_ceo_notify ON public.academy_messages;
CREATE TRIGGER academy_messages_ceo_notify
AFTER INSERT ON public.academy_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_ceo_message();

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
  IF NEW.type NOT IN ('mention', 'rz_message') THEN
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

DROP TRIGGER IF EXISTS academy_notifications_push_notify ON public.academy_notifications;
CREATE TRIGGER academy_notifications_push_notify
AFTER INSERT ON public.academy_notifications
FOR EACH ROW
EXECUTE FUNCTION public.push_notify_on_insert();
