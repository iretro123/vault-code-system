CREATE OR REPLACE FUNCTION public.notify_ceo_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  snippet text;
  can_broadcast boolean;
BEGIN
  IF NEW.is_deleted THEN
    RETURN NEW;
  END IF;

  can_broadcast := public.is_academy_ceo(NEW.user_id)
    OR public.has_role(NEW.user_id, 'operator'::public.app_role)
    OR public.has_role(NEW.user_id, 'vault_os_owner'::public.app_role)
    OR public.has_academy_permission(NEW.user_id, 'manage_notifications');

  IF NOT can_broadcast THEN
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

  -- Signals room stays paid-only: per-user rows for entitled members
  IF NEW.room_slug = 'daily-setups' THEN
    INSERT INTO public.academy_notifications (user_id, type, title, body, link_path)
    SELECT DISTINCT
      ur.user_id,
      'rz_message',
      NEW.user_name || ' posted in #' || NEW.room_slug,
      snippet,
      '/academy/community?tab=daily-setups'
    FROM public.user_roles ur
    WHERE ur.role IN (
        'vault_access'::public.app_role,
        'vault_intelligence'::public.app_role,
        'vault_os_owner'::public.app_role,
        'operator'::public.app_role
      );
    RETURN NEW;
  END IF;

  -- Public community rooms: broadcast to everyone, including free/basic members
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

UPDATE public.profiles SET access_status = 'active' WHERE access_status = 'trial';