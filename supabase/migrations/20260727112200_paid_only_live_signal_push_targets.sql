-- Keep public @everyone/chat broadcasts available to all authenticated users,
-- but make Live-room and trading-signal push alerts paid-only. These functions
-- create targeted notifications so push-notify only sends to matching user_id
-- device tokens instead of broadcasting to every free/basic token.

CREATE OR REPLACE FUNCTION public.notify_live_now()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_academy_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.academy_notifications (user_id, type, title, body, link_path)
  SELECT DISTINCT
    ur.user_id,
    'live_now',
    'Vault Trading Academy is Live Now.',
    '',
    '/academy/live'
  FROM public.user_roles ur
  WHERE ur.role IN (
      'vault_access'::public.app_role,
      'vault_intelligence'::public.app_role,
      'vault_os_owner'::public.app_role,
      'operator'::public.app_role
    )
    AND (
      ur.subscription_status = 'active'
      OR ur.role IN (
        'vault_intelligence'::public.app_role,
        'vault_os_owner'::public.app_role,
        'operator'::public.app_role
      )
    );
END;
$$;

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
    snippet := LEFT(snippet, 140) || '...';
  END IF;

  INSERT INTO public.academy_notifications (user_id, type, title, body, link_path)
  SELECT DISTINCT
    ur.user_id,
    'announcement',
    NEW.user_name || ' posted a new signal in #daily-setups',
    snippet,
    '/academy/community?tab=daily-setups'
  FROM public.user_roles ur
  WHERE ur.role IN (
      'vault_access'::public.app_role,
      'vault_intelligence'::public.app_role,
      'vault_os_owner'::public.app_role,
      'operator'::public.app_role
    )
    AND (
      ur.subscription_status = 'active'
      OR ur.role IN (
        'vault_intelligence'::public.app_role,
        'vault_os_owner'::public.app_role,
        'operator'::public.app_role
      )
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_messages_guest_signal_notify ON public.academy_messages;
CREATE TRIGGER academy_messages_guest_signal_notify
AFTER INSERT ON public.academy_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_guest_signal_message();
