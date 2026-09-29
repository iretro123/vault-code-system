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
