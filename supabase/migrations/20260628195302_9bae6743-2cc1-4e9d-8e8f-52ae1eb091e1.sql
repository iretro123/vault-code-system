-- Broadcast guest-visible signal pushes from the backend so all clients
-- produce the same notification behavior and guest devices do not depend on a
-- specific app build to receive signal alerts.
CREATE OR REPLACE FUNCTION public.notify_guest_signal_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snippet text;
  can_broadcast boolean;
BEGIN
  IF NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  IF NEW.room_slug <> 'daily-setups' THEN
    RETURN NEW;
  END IF;

  IF POSITION('@everyone' IN LOWER(COALESCE(NEW.body, ''))) > 0 THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(NEW.attachments, '[]'::jsonb)) AS attachment
    WHERE attachment->>'type' IN ('signal-watchlist', 'signal-live')
  ) THEN
    RETURN NEW;
  END IF;

  can_broadcast := public.has_academy_permission(NEW.user_id, 'manage_notifications')
    OR public.has_role(NEW.user_id, 'operator'::public.app_role);

  IF NOT can_broadcast THEN
    RETURN NEW;
  END IF;

  snippet := NULLIF(BTRIM(COALESCE(NEW.body, '')), '');
  IF snippet IS NULL THEN
    snippet := 'Open Vault OS to view the new signal.';
  ELSIF LENGTH(snippet) > 140 THEN
    snippet := LEFT(snippet, 140) || '…';
  END IF;

  INSERT INTO public.academy_notifications (user_id, type, title, body, link_path)
  VALUES (
    NULL,
    'announcement',
    NEW.user_name || ' posted a new signal in #daily-setups',
    snippet,
    '/academy/community?tab=daily-setups'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_messages_guest_signal_notify ON public.academy_messages;
CREATE TRIGGER academy_messages_guest_signal_notify
AFTER INSERT ON public.academy_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_guest_signal_message();