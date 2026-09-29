-- lovable-cron-fallback-reviewed: owner-reviewed durable push queue; wake-on-enqueue is primary, the per-minute job only re-wakes when due jobs exist (early-return EXISTS, no HTTP when empty) to recover lost wakes and provider retries.
-- Coordinated activation (commit 210f0d9e). Prerequisite: repo migration
-- 20260806173000 (Android activations) was never applied live; the canonical
-- entitlement function references it. Exact repo DDL plus required grants.
CREATE TABLE IF NOT EXISTS public.android_membership_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  purchase_token TEXT NOT NULL UNIQUE,
  order_id TEXT,
  package_name TEXT NOT NULL,
  purchase_date TIMESTAMPTZ,
  expires_date TIMESTAMPTZ,
  acknowledgement_state TEXT,
  subscription_state TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.android_membership_activations TO authenticated;
GRANT ALL ON public.android_membership_activations TO service_role;
CREATE INDEX IF NOT EXISTS idx_android_membership_activations_user_id
  ON public.android_membership_activations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_android_membership_activations_order_id
  ON public.android_membership_activations(order_id) WHERE order_id IS NOT NULL;
DROP TRIGGER IF EXISTS update_android_membership_activations_updated_at ON public.android_membership_activations;
CREATE TRIGGER update_android_membership_activations_updated_at
  BEFORE UPDATE ON public.android_membership_activations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.android_membership_activations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own android membership activations" ON public.android_membership_activations;
CREATE POLICY "Users can view their own android membership activations"
  ON public.android_membership_activations FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'operator'::app_role));

-- Provision Vault secrets server-side from the currently deployed trigger.
-- The value never appears in this file; aborts the whole activation if absent.
DO $vault$
DECLARE s text;
BEGIN
  s := substring(pg_get_functiondef('public.push_notify_on_insert'::regproc)
        from $re$'x-push-secret',\s*'([^']+)'$re$);
  IF s IS NULL OR length(s) < 16 THEN
    RAISE EXCEPTION 'Existing push secret could not be located; activation aborted';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='push_webhook_secret') THEN
    PERFORM vault.create_secret(s, 'push_webhook_secret', 'x-push-secret for push-notify');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='push_notify_url') THEN
    PERFORM vault.create_secret('https://oemylhcjqncovnmvvgxh.supabase.co/functions/v1/push-notify', 'push_notify_url', 'push-notify endpoint');
  END IF;
END $vault$;

-- One decision for navigation, RLS, and billing recovery. Roles alone never
-- prove payment. Ban checks run before whitelist and staff exemptions.
CREATE OR REPLACE FUNCTION public.vault_access_for_user(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u JOIN public.profiles p ON p.user_id=u.id
    WHERE u.id=uid AND coalesce(p.is_banned,false)=false
      AND coalesce(p.access_status,'') NOT IN ('banned','revoked')
      AND (
        EXISTS (SELECT 1 FROM public.allowed_signups a
          WHERE lower(btrim(a.email))=lower(btrim(u.email)))
        OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=uid
          AND r.role::text IN ('operator','vault_os_owner'))
        OR EXISTS (SELECT 1 FROM public.academy_user_roles ar
          JOIN public.academy_roles r ON r.id=ar.role_id
          WHERE ar.user_id=uid AND r.name IN ('CEO','Admin','Coach'))
        OR EXISTS (SELECT 1 FROM public.students s
          JOIN public.student_access sa ON sa.user_id=s.id
          WHERE s.auth_user_id=uid AND sa.status='active'
            AND sa.product_key IN ('vault_os','vault_academy')
            AND sa.stripe_subscription_id IS NOT NULL
            AND sa.stripe_customer_id IS NOT NULL)
        OR EXISTS (SELECT 1 FROM public.ios_membership_activations a
          WHERE a.user_id=uid AND a.expires_date>now()
            AND a.metadata->>'apple_verified'='true'
            AND a.metadata->>'revocation_date' IS NULL)
        OR EXISTS (SELECT 1 FROM public.android_membership_activations a
          WHERE a.user_id=uid AND a.expires_date>now()
            AND a.subscription_state IN ('SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_CANCELED'))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.vault_access_for_user(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.vault_access_for_user(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.has_current_full_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.vault_access_for_user(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.has_current_full_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_current_full_access() TO authenticated,anon,service_role;

CREATE OR REPLACE FUNCTION public.get_my_access_state()
RETURNS TABLE(student_id uuid,product_key text,tier text,status text,
  stripe_customer_id text,updated_at timestamptz,has_access boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT s.id,
    CASE WHEN e.allowed THEN 'vault_os' ELSE sa.product_key END,
    CASE WHEN e.allowed THEN 'full_access' ELSE sa.tier END,
    CASE WHEN e.allowed THEN 'active' ELSE coalesce(sa.status,'none') END,
    s.stripe_customer_id,sa.updated_at,e.allowed
  FROM (SELECT public.vault_access_for_user(auth.uid()) AS allowed) e
  LEFT JOIN LATERAL (SELECT * FROM public.students WHERE auth_user_id=auth.uid()
    ORDER BY created_at DESC LIMIT 1) s ON true
  LEFT JOIN LATERAL (SELECT * FROM public.student_access WHERE user_id=s.id
    ORDER BY updated_at DESC LIMIT 1) sa ON true
  WHERE auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_my_access_state() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_access_state() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.can_use_free_community()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid()
    AND coalesce(p.is_banned,false)=false
    AND coalesce(p.access_status,'') NOT IN ('banned','revoked'));
$$;
REVOKE ALL ON FUNCTION public.can_use_free_community() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_use_free_community() TO authenticated,anon,service_role;

-- Restrictive policies AND with existing permissive policies, including older
-- broad SELECT policies. They never replace author/moderator write checks.
CREATE POLICY "Membership boundary for community" ON public.academy_messages
AS RESTRICTIVE FOR ALL TO authenticated,anon
USING (public.has_current_full_access() OR
  (public.can_use_free_community() AND room_slug IN ('trade-floor','wins-proof','questions','off-topic')))
WITH CHECK (public.has_current_full_access() OR
  (public.can_use_free_community() AND room_slug IN ('trade-floor','wins-proof','questions','off-topic')));

CREATE POLICY "Membership boundary for lessons" ON public.academy_lessons
AS RESTRICTIVE FOR SELECT TO authenticated,anon
USING (public.has_current_full_access() OR
  (public.can_use_free_community() AND module_slug='chapter-1-basic-bridge'));

CREATE POLICY "Membership boundary for live room links" ON public.live_sessions
AS RESTRICTIVE FOR SELECT TO authenticated,anon
USING (public.has_current_full_access());

CREATE OR REPLACE FUNCTION public.can_read_pulse(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.vault_access_for_user(p_user);
$$;

-- Notifications must not leak paid snippets after access expires. Existing
-- recipient ownership policies remain in force alongside this restriction.
CREATE OR REPLACE FUNCTION public.vault_paid_notification(kind text,path text,title text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT coalesce(kind='live_now' OR path LIKE '/academy/live%'
    OR path LIKE '%tab=daily-setups%' OR path LIKE '/academy/room/%'
    OR title LIKE '%#daily-setups%',false);
$$;
CREATE POLICY "Membership boundary for notifications" ON public.academy_notifications
AS RESTRICTIVE FOR SELECT TO authenticated,anon USING (
  NOT public.vault_paid_notification(type,link_path,title) OR public.has_current_full_access());

CREATE OR REPLACE FUNCTION public.guard_paid_notification_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.vault_paid_notification(NEW.type,NEW.link_path,NEW.title)
    AND (NEW.user_id IS NULL OR NOT public.vault_access_for_user(NEW.user_id)) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_paid_notification_recipient() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_paid_notification_recipient BEFORE INSERT ON public.academy_notifications
FOR EACH ROW EXECUTE FUNCTION public.guard_paid_notification_recipient();

-- Keep private-room mention bodies out of public broadcast notifications.
CREATE OR REPLACE FUNCTION public.create_mention_notifications(
  _sender_name text,_room_slug text,_body text,
  _mentioned_user_ids uuid[] DEFAULT ARRAY[]::uuid[],_notify_everyone boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE caller_id uuid:=auth.uid(); target_id uuid;
  paid_room boolean:=NOT coalesce(_room_slug IN ('trade-floor','wins-proof','questions','off-topic'),false);
  destination text;
BEGIN
  IF caller_id IS NULL OR NOT public.can_use_free_community() THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF paid_room AND NOT public.vault_access_for_user(caller_id) THEN RAISE EXCEPTION 'Membership required'; END IF;
  destination:=CASE WHEN paid_room THEN '/academy/room/'||_room_slug ELSE '/academy/community' END;
  IF _notify_everyone THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=caller_id AND role::text IN ('operator','vault_os_owner'))
      AND NOT EXISTS (SELECT 1 FROM public.academy_user_roles ar JOIN public.academy_roles r ON r.id=ar.role_id WHERE ar.user_id=caller_id AND r.name='CEO')
      THEN RAISE EXCEPTION 'Only operators can notify everyone'; END IF;
    IF paid_room THEN
      INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
      SELECT p.user_id,'mention',coalesce(_sender_name,'Someone')||' mentioned @everyone',left(coalesce(_body,''),80),destination
      FROM public.profiles p WHERE public.vault_access_for_user(p.user_id);
    ELSE
      INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
      VALUES(NULL,'mention',coalesce(_sender_name,'Someone')||' mentioned @everyone',left(coalesce(_body,''),80),destination);
    END IF;
    RETURN;
  END IF;
  FOREACH target_id IN ARRAY coalesce(_mentioned_user_ids,ARRAY[]::uuid[]) LOOP
    IF target_id IS NULL OR target_id=caller_id THEN CONTINUE; END IF;
    IF paid_room AND NOT public.vault_access_for_user(target_id) THEN CONTINUE; END IF;
    INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
    VALUES(target_id,'mention',coalesce(_sender_name,'Someone')||' mentioned you',left(coalesce(_body,''),80),destination);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.create_mention_notifications(text,text,text,uuid[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_mention_notifications(text,text,text,uuid[],boolean) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.notify_ceo_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.is_deleted OR position('@everyone' IN lower(coalesce(NEW.body,'')))>0 THEN RETURN NEW; END IF;
  IF NOT (public.is_academy_ceo(NEW.user_id) OR public.has_academy_permission(NEW.user_id,'manage_notifications')
    OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=NEW.user_id AND role::text IN ('operator','vault_os_owner')))
    THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(NEW.attachments,'[]'::jsonb)) a
    WHERE a->>'type' IN ('signal-watchlist','signal-live')) THEN RETURN NEW; END IF;
  IF NEW.room_slug IN ('trade-floor','wins-proof','questions','off-topic') THEN
    INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
    VALUES(NULL,'rz_message',NEW.user_name||' posted in #'||NEW.room_slug,left(coalesce(NEW.body,''),140),'/academy/community');
  ELSE
    INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
    SELECT p.user_id,'rz_message',NEW.user_name||' posted in #'||NEW.room_slug,left(coalesce(NEW.body,''),140),'/academy/room/'||NEW.room_slug
    FROM public.profiles p WHERE public.vault_access_for_user(p.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Never let whitelist repair clear a moderation ban.
CREATE OR REPLACE FUNCTION public.grant_whitelist_access(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid;
BEGIN
  SELECT u.id INTO _uid FROM auth.users u JOIN public.profiles p ON p.user_id=u.id
  WHERE lower(btrim(u.email))=lower(btrim(_email))
    AND coalesce(p.is_banned,false)=false
    AND coalesce(p.access_status,'') NOT IN ('banned','revoked')
    AND EXISTS (SELECT 1 FROM public.allowed_signups a
      WHERE lower(btrim(a.email))=lower(btrim(u.email)))
  ORDER BY u.created_at LIMIT 1;
  IF _uid IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_uid
    AND role::text IN ('operator','vault_os_owner')) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_uid AND role::text='vault_access') THEN
    INSERT INTO public.user_roles(user_id,role,subscription_status,access_source)
    VALUES(_uid,'vault_access','active','whitelist') ON CONFLICT DO NOTHING;
  END IF;
  DELETE FROM public.user_roles WHERE user_id=_uid AND role::text IN ('basic_tier','free');
  UPDATE public.profiles SET access_status='active',updated_at=now() WHERE user_id=_uid;
END;
$$;
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
-- Deploy with push-notify after the canonical membership migration.
-- No historical notification backfill: only newly saved events enqueue delivery.
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS notify_chat boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS notify_pulse boolean NOT NULL DEFAULT true;
ALTER TABLE public.academy_notifications ADD COLUMN IF NOT EXISTS source_pulse_id text REFERENCES public.pulse_spy_events(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS academy_pulse_notification_once ON public.academy_notifications(user_id,source_pulse_id) WHERE type='pulse_zone';

CREATE OR REPLACE FUNCTION public.vault_paid_notification(kind text,path text,title text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT coalesce(kind IN ('live_now','pulse_zone') OR path LIKE '/academy/live%'
   OR path LIKE '%tab=daily-setups%' OR path LIKE '%tab=pulse%'
   OR (path LIKE '/academy/room/%' AND split_part(split_part(path,'/academy/room/',2),'?',1) NOT IN ('trade-floor','wins-proof','questions','off-topic'))
   OR title LIKE '%#daily-setups%',false);
$$;

CREATE OR REPLACE FUNCTION public.vault_can_broadcast(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.vault_access_for_user(uid) AND (
   EXISTS(SELECT 1 FROM user_roles WHERE user_id=uid AND role::text IN ('operator','vault_os_owner'))
   OR EXISTS(SELECT 1 FROM academy_user_roles ar JOIN academy_roles r ON r.id=ar.role_id WHERE ar.user_id=uid AND r.name IN ('CEO','Admin')));
$$;
REVOKE ALL ON FUNCTION public.vault_can_broadcast(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.guard_chat_broadcast_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND coalesce(NEW.body,'') ~* '(^|[^[:alnum:]_])@(everyone|here)([^[:alnum:]_]|$)'
   AND NOT public.vault_can_broadcast(auth.uid()) THEN
   RAISE EXCEPTION 'Only authorized staff can use @everyone or @here' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_chat_broadcast_mentions() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_chat_broadcast_mentions BEFORE INSERT OR UPDATE OF body ON public.academy_messages FOR EACH ROW EXECUTE FUNCTION public.guard_chat_broadcast_mentions();

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.room_slug NOT IN ('trade-floor','wins-proof','questions','off-topic','daily-setups') OR coalesce(NEW.is_deleted,false) THEN RETURN NEW; END IF;
 INSERT INTO academy_notifications(user_id,type,title,body,link_path,source_message_id)
 SELECT p.user_id,'chat_message',CASE WHEN NEW.room_slug='daily-setups' THEN 'New signal' ELSE 'New message in '||CASE WHEN NEW.room_slug='trade-floor' THEN 'Chat' WHEN NEW.room_slug='wins-proof' THEN 'Wins' ELSE NEW.room_slug END END,
   left(coalesce(nullif(btrim(NEW.body),''),'Shared an attachment'),180),'/academy/room/'||NEW.room_slug,NEW.id
 FROM profiles p LEFT JOIN user_preferences pref ON pref.user_id=p.user_id
 WHERE p.user_id<>NEW.user_id AND NOT coalesce(p.is_banned,false) AND coalesce(p.access_status,'') NOT IN ('banned','revoked')
   AND coalesce(pref.notifications_enabled,true) AND coalesce(pref.notify_chat,true)
   AND (NEW.room_slug<>'daily-setups' OR public.vault_access_for_user(p.user_id))
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;
-- The new saved-message trigger covers staff too, preventing duplicate CEO alerts.
CREATE OR REPLACE FUNCTION public.notify_ceo_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.notify_pulse_zone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 -- Holding/heartbeat snapshots do not buzz repeatedly. No stale/replay alerts.
 IF coalesce(NEW.body->>'kind','') NOT IN ('observed','entered','returned','breached','broken')
   OR NEW.at < extract(epoch FROM now()-interval '2 minutes')*1000
   OR NEW.at > extract(epoch FROM now()+interval '30 seconds')*1000
   OR coalesce((NEW.body->>'afterHoursTest')::boolean,false) THEN RETURN NEW; END IF;
 INSERT INTO academy_notifications(user_id,type,title,body,link_path,source_pulse_id)
 SELECT p.user_id,'pulse_zone','SPY Pulse · '||NEW.timeframe||'m',
   left(CASE NEW.body->>'kind' WHEN 'observed' THEN 'New ' WHEN 'entered' THEN 'Price entered ' WHEN 'returned' THEN 'Price returned to ' WHEN 'breached' THEN 'Price breached ' ELSE 'Confirmed break of ' END||coalesce(NEW.body->>'side','')||' zone · '||coalesce(NEW.body->>'lower','')||'–'||coalesce(NEW.body->>'upper',''),180),
   '/academy/community?tab=pulse',NEW.id
 FROM profiles p LEFT JOIN user_preferences pref ON pref.user_id=p.user_id
 WHERE public.vault_access_for_user(p.user_id) AND coalesce(pref.notifications_enabled,true) AND coalesce(pref.notify_pulse,true)
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_pulse_zone() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notify_pulse_zone AFTER INSERT ON public.pulse_spy_events FOR EACH ROW EXECUTE FUNCTION public.notify_pulse_zone();

-- Central eligibility check used at enqueue AND at send time.
CREATE OR REPLACE FUNCTION public.vault_notification_deliverable(nid uuid,uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM academy_notifications n JOIN profiles p ON p.user_id=uid
 LEFT JOIN user_preferences pref ON pref.user_id=uid
 WHERE n.id=nid AND (n.user_id=uid OR n.user_id IS NULL)
 AND NOT coalesce(p.is_banned,false) AND coalesce(p.access_status,'') NOT IN ('banned','revoked')
 AND coalesce(pref.notifications_enabled,true)
 AND (NOT public.vault_paid_notification(n.type,n.link_path,n.title) OR public.vault_access_for_user(uid))
 AND CASE n.type
  WHEN 'chat_message' THEN coalesce(pref.notify_chat,true) AND EXISTS(
    SELECT 1 FROM academy_messages m WHERE m.id=n.source_message_id AND NOT coalesce(m.is_deleted,false)
      AND m.user_id<>uid AND m.room_slug IN ('trade-floor','wins-proof','questions','off-topic','daily-setups')
      AND n.link_path='/academy/room/'||m.room_slug
      AND (m.room_slug<>'daily-setups' OR public.vault_access_for_user(uid)))
  WHEN 'pulse_zone' THEN coalesce(pref.notify_pulse,true) AND n.link_path='/academy/community?tab=pulse' AND EXISTS(
    SELECT 1 FROM pulse_spy_events e WHERE e.id=n.source_pulse_id AND e.at>=extract(epoch FROM now()-interval '5 minutes')*1000)
  WHEN 'live_now' THEN coalesce(pref.notify_live_events,true) AND n.link_path='/academy/live'
  ELSE false END);
$$;
REVOKE ALL ON FUNCTION public.vault_notification_deliverable(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.vault_notification_deliverable(uuid,uuid) TO service_role;

CREATE TABLE public.notification_push_jobs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notification_id uuid NOT NULL REFERENCES academy_notifications(id) ON DELETE CASCADE,
 device_id uuid NOT NULL REFERENCES device_tokens(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','skipped','dead')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, claim_token uuid,
 created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,last_error text,
 UNIQUE(notification_id,device_id));
ALTER TABLE public.notification_push_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_push_jobs FROM anon,authenticated;
GRANT ALL ON public.notification_push_jobs TO service_role;
CREATE INDEX notification_push_jobs_due ON notification_push_jobs(available_at) WHERE state IN ('pending','processing');

CREATE OR REPLACE FUNCTION public.wake_vault_push()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE push_secret text; push_url text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM notification_push_jobs WHERE state IN ('pending','processing') AND available_at<=now()) THEN RETURN; END IF;
 SELECT decrypted_secret INTO push_secret FROM vault.decrypted_secrets WHERE name='push_webhook_secret' LIMIT 1;
 SELECT decrypted_secret INTO push_url FROM vault.decrypted_secrets WHERE name='push_notify_url' LIMIT 1;
 IF push_secret IS NULL OR push_url IS NULL OR push_url NOT LIKE 'https://%' THEN RETURN; END IF;
 PERFORM net.http_post(url:=push_url,headers:=jsonb_build_object('Content-Type','application/json','x-push-secret',push_secret),body:='{}'::jsonb,timeout_milliseconds:=60000);
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Push wake failed; durable jobs retained';
END; $$;
REVOKE ALL ON FUNCTION public.wake_vault_push() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.wake_vault_push() TO service_role;

CREATE OR REPLACE FUNCTION public.push_notify_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.type NOT IN ('chat_message','pulse_zone','live_now') THEN RETURN NEW; END IF;
 INSERT INTO notification_push_jobs(notification_id,device_id,user_id)
 SELECT NEW.id,d.id,d.user_id FROM device_tokens d
 WHERE split_part(d.platform,':',1) IN ('ios','android','web') AND public.vault_notification_deliverable(NEW.id,d.user_id)
 ON CONFLICT DO NOTHING;
 -- One wake per SQL statement below, rather than an HTTP request per member.
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.wake_vault_push_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.wake_vault_push(); RETURN NULL; END; $$;
REVOKE ALL ON FUNCTION public.wake_vault_push_after_insert() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER wake_vault_push_after_insert AFTER INSERT ON public.academy_notifications FOR EACH STATEMENT EXECUTE FUNCTION public.wake_vault_push_after_insert();

CREATE OR REPLACE FUNCTION public.claim_vault_push_jobs(batch_size integer DEFAULT 25)
RETURNS SETOF public.notification_push_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE notification_push_jobs SET state='dead',finished_at=now(),last_error='expired_or_attempt_limit'
 WHERE state IN ('pending','processing') AND (created_at<now()-interval '30 minutes' OR (attempts>=6 AND coalesce(lease_until,now())<=now()));
 RETURN QUERY WITH candidates AS (
 SELECT id FROM notification_push_jobs WHERE attempts<6 AND available_at<=now()
 AND (state='pending' OR (state='processing' AND lease_until<now()))
 ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(batch_size,50)))
 UPDATE notification_push_jobs j SET state='processing',attempts=attempts+1,lease_until=now()+interval '2 minutes',claim_token=gen_random_uuid()
 FROM candidates c WHERE j.id=c.id RETURNING j.*;
END; $$;
REVOKE ALL ON FUNCTION public.claim_vault_push_jobs(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vault_push_jobs(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.finish_vault_push_job(job_id uuid,lease_token uuid,outcome text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE changed integer;
BEGIN
 IF outcome NOT IN ('sent','skipped','retry','dead') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 UPDATE notification_push_jobs SET state=CASE WHEN outcome='retry' THEN CASE WHEN attempts>=6 THEN 'dead' ELSE 'pending' END ELSE outcome END,
 available_at=now()+make_interval(secs=>least(900,(15*power(2,attempts))::integer)),lease_until=NULL,claim_token=NULL,
 finished_at=CASE WHEN outcome IN ('sent','skipped','dead') OR attempts>=6 THEN now() ELSE NULL END,
 last_error=CASE WHEN outcome='retry' THEN 'provider_retry' WHEN outcome='dead' THEN 'permanent_failure' ELSE NULL END
 WHERE id=job_id AND state='processing' AND claim_token=lease_token AND lease_until>now();
 GET DIAGNOSTICS changed=ROW_COUNT; RETURN changed=1;
END; $$;
REVOKE ALL ON FUNCTION public.finish_vault_push_job(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_vault_push_job(uuid,uuid,text) TO service_role;

-- Database timer is independent of open member browsers and recovers lost wakes.
SELECT cron.schedule('vault-push-retry','* * * * *','SELECT public.wake_vault_push()');
SELECT cron.schedule('vault-push-retention','19 4 * * *',$$DELETE FROM public.notification_push_jobs WHERE finished_at<now()-interval '7 days'$$);

-- Paid broadcasts are individualized before any recipient can read or receive them.
CREATE OR REPLACE FUNCTION public.guard_paid_notification_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.vault_paid_notification(NEW.type,NEW.link_path,NEW.title) THEN
  IF NEW.user_id IS NULL THEN
   INSERT INTO academy_notifications(user_id,type,title,body,link_path,source_message_id,source_pulse_id)
   SELECT p.user_id,NEW.type,NEW.title,NEW.body,NEW.link_path,NEW.source_message_id,NEW.source_pulse_id
   FROM profiles p WHERE public.vault_access_for_user(p.user_id);
   RETURN NULL;
  ELSIF NOT public.vault_access_for_user(NEW.user_id) THEN RETURN NULL;
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE POLICY "Banned users cannot read notifications" ON public.academy_notifications AS RESTRICTIVE FOR SELECT TO authenticated,anon USING(public.can_use_free_community());

-- Legacy client signature retained, but sender identity/body must match a saved
-- message. A client cannot invent a paid snippet, sender, or mass notification.
CREATE OR REPLACE FUNCTION public.create_mention_notifications(
 _sender_name text,_room_slug text,_body text,_mentioned_user_ids uuid[] DEFAULT ARRAY[]::uuid[],_notify_everyone boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE caller uuid:=auth.uid(); message_row public.academy_messages;
BEGIN
 IF caller IS NULL OR NOT public.can_use_free_community() THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF _notify_everyone AND NOT public.vault_can_broadcast(caller) THEN RAISE EXCEPTION 'Staff broadcast permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO message_row FROM academy_messages m WHERE m.user_id=caller AND m.room_slug=_room_slug AND m.body=_body
   AND NOT coalesce(m.is_deleted,false) AND m.created_at>now()-interval '10 minutes' ORDER BY m.created_at DESC LIMIT 1;
 IF message_row.id IS NULL THEN RAISE EXCEPTION 'Saved message required' USING ERRCODE='42501'; END IF;
 IF _room_slug NOT IN ('trade-floor','wins-proof','questions','off-topic') AND NOT public.vault_access_for_user(caller) THEN
  RAISE EXCEPTION 'Membership required' USING ERRCODE='42501'; END IF;
 -- The saved-message trigger already created recipient notifications for these
 -- rooms, including replies. Calling this RPC must not create duplicates.
 IF _room_slug IN ('trade-floor','wins-proof','questions','off-topic','daily-setups') THEN RETURN; END IF;
 INSERT INTO academy_notifications(user_id,type,title,body,link_path)
 SELECT p.user_id,'mention',coalesce(message_row.user_name,'A member')||' mentioned you',left(message_row.body,180),'/academy/room/'||_room_slug
 FROM profiles p WHERE p.user_id<>caller AND public.vault_access_for_user(p.user_id)
 AND (_notify_everyone OR p.user_id=ANY(coalesce(_mentioned_user_ids,ARRAY[]::uuid[]))) LIMIT 500;
END; $$;

-- Bound per-member fanout abuse. Staff broadcasts use their own permissions;
-- ordinary conversation still permits short bursts and replies.
CREATE OR REPLACE FUNCTION public.guard_chat_post_rate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 NEW.created_at:=now();
 IF public.vault_can_broadcast(auth.uid()) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 IF (SELECT count(*) FROM academy_messages WHERE user_id=auth.uid() AND created_at>now()-interval '1 minute')>=30 THEN
  RAISE EXCEPTION 'You are sending messages too quickly. Please wait a moment.' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_chat_post_rate() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_chat_post_rate BEFORE INSERT ON public.academy_messages FOR EACH ROW EXECUTE FUNCTION public.guard_chat_post_rate();

-- Signals now use the same saved-message fanout; avoid duplicate inbox entries.
CREATE OR REPLACE FUNCTION public.notify_guest_signal_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN NEW; END; $$;