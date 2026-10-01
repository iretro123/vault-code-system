-- Preserve existing SPY preferences; QQQ requires explicit opt-in.
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS notify_pulse_spy boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS notify_pulse_qqq boolean NOT NULL DEFAULT false;

-- Fail closed for unrecognized symbols; shared by enqueue and delivery.
CREATE OR REPLACE FUNCTION public.pulse_symbol_opted_in(symbol text, spy boolean, qqq boolean)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE symbol WHEN 'AMEX:SPY' THEN coalesce(spy,true) WHEN 'NASDAQ:QQQ' THEN coalesce(qqq,false) ELSE false END;
$$;

CREATE OR REPLACE FUNCTION public.notify_pulse_zone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 -- Holding/heartbeat snapshots do not buzz repeatedly. No stale/replay alerts.
 IF coalesce(NEW.body->>'kind','') NOT IN ('observed','entered','broken')
   OR NEW.at < extract(epoch FROM now()-interval '2 minutes')*1000
   OR NEW.at > extract(epoch FROM now()+interval '30 seconds')*1000
   OR coalesce((NEW.body->>'afterHoursTest')::boolean,false) THEN RETURN NEW; END IF;
 INSERT INTO academy_notifications(user_id,type,title,body,link_path,source_pulse_id)
 SELECT p.user_id,'pulse_zone',split_part(NEW.body->>'symbol',':',2)||' Pulse · '||NEW.timeframe||'m',
   left(CASE NEW.body->>'kind' WHEN 'observed' THEN 'New ' WHEN 'entered' THEN 'Price entered ' WHEN 'returned' THEN 'Price returned to ' WHEN 'breached' THEN 'Price breached ' ELSE 'Confirmed break of ' END||coalesce(NEW.body->>'side','')||' zone · '||coalesce(NEW.body->>'lower','')||'–'||coalesce(NEW.body->>'upper',''),180),
   '/academy/community?tab=pulse',NEW.id
 FROM profiles p LEFT JOIN user_preferences pref ON pref.user_id=p.user_id
 WHERE public.vault_access_for_user(p.user_id) AND coalesce(pref.notifications_enabled,true) AND coalesce(pref.notify_pulse,true)
 AND public.pulse_symbol_opted_in(NEW.body->>'symbol',pref.notify_pulse_spy,pref.notify_pulse_qqq)
 AND NOT EXISTS (SELECT 1 FROM academy_notifications prior JOIN pulse_spy_events old ON old.id=prior.source_pulse_id WHERE prior.user_id=p.user_id AND prior.type='pulse_zone' AND old.body->>'symbol'=NEW.body->>'symbol' AND old.body->>'zoneId'=NEW.body->>'zoneId' AND old.body->>'kind'=NEW.body->>'kind' AND old.timeframe=NEW.timeframe AND prior.created_at>now()-interval '5 minutes')
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_pulse_zone() FROM PUBLIC,anon,authenticated;

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
    SELECT 1 FROM pulse_spy_events e WHERE e.id=n.source_pulse_id AND public.pulse_symbol_opted_in(e.body->>'symbol',pref.notify_pulse_spy,pref.notify_pulse_qqq) AND e.body->>'kind' IN ('observed','entered','broken') AND e.at>=extract(epoch FROM now()-interval '5 minutes')*1000)
  WHEN 'live_now' THEN coalesce(pref.notify_live_events,true) AND n.link_path='/academy/live'
  WHEN 'personal_reminder' THEN n.user_id=uid AND n.link_path='/academy/community?space=mine'
   AND n.created_at>now()-interval '30 minutes' AND EXISTS(SELECT 1 FROM member_spaces s WHERE s.user_id=uid AND s.enabled)
  ELSE false END);
$$;
REVOKE ALL ON FUNCTION public.vault_notification_deliverable(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.vault_notification_deliverable(uuid,uuid) TO service_role;


