-- Roll out with the updated push-notify function. Configure the two Vault
-- secrets below before enabling delivery. Never embed a webhook secret in SQL.
ALTER TABLE public.academy_notifications
  ADD COLUMN IF NOT EXISTS source_message_id uuid REFERENCES public.academy_messages(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS academy_chat_notification_once
  ON public.academy_notifications(user_id, source_message_id)
  WHERE type = 'chat_message';

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.room_slug <> 'trade-floor' OR coalesce(NEW.is_deleted,false) THEN RETURN NEW; END IF;
  INSERT INTO public.academy_notifications(user_id,type,title,body,link_path,source_message_id)
  SELECT p.user_id,'chat_message','New message in Chat Room',
    left(coalesce(nullif(btrim(NEW.body),''),'Shared an attachment'),180),
    '/academy/room/trade-floor',NEW.id
  FROM public.profiles p
  LEFT JOIN public.user_preferences pref ON pref.user_id=p.user_id
  WHERE p.user_id<>NEW.user_id
    AND NOT coalesce(p.is_banned,false)
    AND coalesce(p.access_status,'') NOT IN ('banned','revoked')
    AND coalesce(pref.notifications_enabled,true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_chat_message() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notify_chat_message AFTER INSERT ON public.academy_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_message();

CREATE OR REPLACE FUNCTION public.push_notify_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE
  push_secret text;
  push_url text;
BEGIN
  IF NEW.type <> 'chat_message' OR NEW.user_id IS NULL OR NEW.source_message_id IS NULL THEN RETURN NEW; END IF;
  SELECT decrypted_secret INTO push_secret FROM vault.decrypted_secrets WHERE name='push_webhook_secret' LIMIT 1;
  SELECT decrypted_secret INTO push_url FROM vault.decrypted_secrets WHERE name='push_notify_url' LIMIT 1;
  IF push_secret IS NULL OR push_url IS NULL OR push_url NOT LIKE 'https://%' THEN
    RAISE WARNING 'Chat push delivery is not configured';
    RETURN NEW;
  END IF;
  PERFORM net.http_post(url:=push_url,
    headers:=jsonb_build_object('Content-Type','application/json','x-push-secret',push_secret),
    body:=jsonb_build_object('notification_id',NEW.id));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Notification transport must never roll back a member's saved message.
  RAISE WARNING 'Chat push enqueue failed';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.push_notify_on_insert() FROM PUBLIC,anon,authenticated;
