BEGIN;
CREATE TABLE public.member_spaces (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 rules text[] NOT NULL DEFAULT '{}', notes text NOT NULL DEFAULT '',
 enabled boolean NOT NULL DEFAULT false, weekdays_only boolean NOT NULL DEFAULT true,
 timezone text NOT NULL DEFAULT 'America/New_York', morning time NOT NULL DEFAULT '09:00', afternoon time NOT NULL DEFAULT '13:00',
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(cardinality(rules)<=12 AND length(notes)<=2000), CHECK(morning<'12:00' AND afternoon>='12:00')
);
ALTER TABLE public.member_spaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_spaces FROM anon,authenticated;
GRANT ALL ON public.member_spaces TO service_role;
CREATE TABLE public.member_space_deliveries (
 user_id uuid NOT NULL REFERENCES public.member_spaces(user_id) ON DELETE CASCADE,
 day date NOT NULL, slot text NOT NULL CHECK(slot IN ('morning','afternoon')), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,day,slot)
);
ALTER TABLE public.member_space_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_space_deliveries FROM anon,authenticated;
GRANT ALL ON public.member_space_deliveries TO service_role;
CREATE FUNCTION public.my_space_get() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(s)-'user_id'-'updated_at' FROM member_spaces s WHERE s.user_id=auth.uid() AND public.can_use_free_community();
$$;
CREATE FUNCTION public.my_space_save(settings jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r text[]; n text; tz text; m time; a time; e boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_use_free_community() THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(settings->'rules') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Rules must be an array'; END IF;
 SELECT coalesce(array_agg(trim(value)), '{}') INTO r FROM jsonb_array_elements_text(settings->'rules');
 n:=coalesce(settings->>'notes',''); tz:=settings->>'timezone';m:=(settings->>'morning')::time;a:=(settings->>'afternoon')::time;e:=coalesce((settings->>'enabled')::boolean,false);
 IF cardinality(r)>12 OR EXISTS(SELECT 1 FROM unnest(r) v WHERE v='' OR length(v)>180) OR length(n)>2000 THEN RAISE EXCEPTION 'Invalid rules or notes'; END IF;
 IF tz IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=tz) THEN RAISE EXCEPTION 'Invalid time zone'; END IF;
 IF m IS NULL OR a IS NULL OR m>='12:00' OR a<'12:00' OR extract(second FROM m)<>0 OR extract(second FROM a)<>0 THEN RAISE EXCEPTION 'Invalid reminder times'; END IF;
 IF e AND cardinality(r)=0 AND trim(n)='' THEN RAISE EXCEPTION 'Add a rule or note first'; END IF;
 INSERT INTO member_spaces(user_id,rules,notes,enabled,weekdays_only,timezone,morning,afternoon)
 VALUES(auth.uid(),r,n,e,coalesce((settings->>'weekdays_only')::boolean,true),tz,m,a)
 ON CONFLICT(user_id) DO UPDATE SET rules=excluded.rules,notes=excluded.notes,enabled=excluded.enabled,weekdays_only=excluded.weekdays_only,timezone=excluded.timezone,morning=excluded.morning,afternoon=excluded.afternoon,updated_at=now();
END; $$;
CREATE FUNCTION public.community_sidebar_summary() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_use_free_community() THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('total',(SELECT count(*) FROM profiles WHERE NOT coalesce(is_banned,false) AND coalesce(access_status,'') NOT IN ('banned','revoked')),
 'online',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT user_id,coalesce(nullif(display_name,''),'Member') display_name,avatar_url FROM profiles WHERE last_seen_at>now()-interval '3 minutes' AND NOT coalesce(is_banned,false) AND coalesce(access_status,'') NOT IN ('banned','revoked') ORDER BY last_seen_at DESC,user_id LIMIT 3) p),'[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.my_space_get(), public.my_space_save(jsonb), public.community_sidebar_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_space_get(), public.my_space_save(jsonb), public.community_sidebar_summary() TO authenticated;

CREATE FUNCTION public.send_member_space_reminders() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE delivered integer;
BEGIN
 -- One transaction: reserve each local-day slot and insert its private inbox notification.
 -- A five-minute recovery window avoids stale reminder floods after an outage.
 WITH due AS (
 SELECT s.user_id,(now() AT TIME ZONE s.timezone)::date AS local_day,t.slot
 FROM member_spaces s JOIN profiles p ON p.user_id=s.user_id LEFT JOIN user_preferences pref ON pref.user_id=s.user_id
 CROSS JOIN LATERAL (VALUES('morning',s.morning),('afternoon',s.afternoon)) t(slot,at_time)
 WHERE s.enabled AND NOT coalesce(p.is_banned,false) AND coalesce(p.access_status,'') NOT IN ('banned','revoked') AND coalesce(pref.notifications_enabled,true)
 AND (NOT s.weekdays_only OR extract(isodow FROM now() AT TIME ZONE s.timezone)<6)
 AND now() >= (((now() AT TIME ZONE s.timezone)::date+t.at_time) AT TIME ZONE s.timezone)
 AND now() < (((now() AT TIME ZONE s.timezone)::date+t.at_time) AT TIME ZONE s.timezone)+interval '5 minutes'
 AND s.updated_at <= (((now() AT TIME ZONE s.timezone)::date+t.at_time) AT TIME ZONE s.timezone)
 ), claimed AS (
 INSERT INTO member_space_deliveries(user_id,day,slot) SELECT user_id,local_day,slot FROM due ON CONFLICT DO NOTHING RETURNING *
 ) INSERT INTO academy_notifications(user_id,type,title,body,link_path)
 SELECT user_id,'personal_reminder',CASE slot WHEN 'morning' THEN 'Your morning reminder' ELSE 'Your afternoon reminder' END,
 'Take a moment to review your trading rules and notes.','/academy/community?space=mine' FROM claimed;
 GET DIAGNOSTICS delivered=ROW_COUNT; RETURN delivered;
END; $$;
REVOKE ALL ON FUNCTION public.send_member_space_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.send_member_space_reminders() TO service_role;
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
  WHEN 'personal_reminder' THEN n.user_id=uid AND n.link_path='/academy/community?space=mine'
   AND n.created_at>now()-interval '30 minutes' AND EXISTS(SELECT 1 FROM member_spaces s WHERE s.user_id=uid AND s.enabled)
  ELSE false END);
$$;
REVOKE ALL ON FUNCTION public.vault_notification_deliverable(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.vault_notification_deliverable(uuid,uuid) TO service_role;


CREATE OR REPLACE FUNCTION public.push_notify_on_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.type NOT IN ('chat_message','pulse_zone','live_now','personal_reminder') THEN RETURN NEW; END IF;
 INSERT INTO notification_push_jobs(notification_id,device_id,user_id)
 SELECT NEW.id,d.id,d.user_id FROM device_tokens d
 WHERE split_part(d.platform,':',1) IN ('ios','android','web') AND public.vault_notification_deliverable(NEW.id,d.user_id)
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;
SELECT cron.schedule('vault-personal-reminders','* * * * *','SELECT public.send_member_space_reminders()');
SELECT cron.schedule('vault-personal-reminder-retention','31 4 * * *', $job$DELETE FROM public.member_space_deliveries WHERE created_at<now()-interval '35 days'$job$);
COMMIT;
