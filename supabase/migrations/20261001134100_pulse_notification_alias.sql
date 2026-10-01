-- Avoid collision with the implicit OLD trigger record. This previously
-- rolled back genuine zone events (42702) while no-zone heartbeats succeeded.
CREATE OR REPLACE FUNCTION public.notify_pulse_zone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 -- Holding/heartbeat snapshots do not buzz repeatedly. No stale/replay alerts.
 IF coalesce(NEW.body->>'kind','') NOT IN ('observed','entered','broken')
   OR NEW.at < extract(epoch FROM now()-interval '2 minutes')*1000
   OR NEW.at > extract(epoch FROM now()+interval '30 seconds')*1000
   OR coalesce((NEW.body->>'afterHoursTest')::boolean,false) THEN RETURN NEW; END IF;
 INSERT INTO academy_notifications(user_id,type,title,body,link_path,source_pulse_id)
 SELECT p.user_id,'pulse_zone',split_part(NEW.body->>'symbol',':',2)||' Pulse · '||NEW.timeframe||'m',
   left(CASE NEW.body->>'kind' WHEN 'observed' THEN 'New ' WHEN 'entered' THEN 'Price entered ' WHEN 'returned' THEN 'Price returned to ' WHEN 'breached' THEN 'Price breached ' ELSE 'Confirmed break of ' END||coalesce(NEW.body->>'side','')||' zone · '||coalesce(NEW.body->>'lower','')||'–'||coalesce(NEW.body->>'upper',''),180),
   '/academy/community?tab=pulse'||CASE WHEN NEW.body->>'symbol'='NASDAQ:QQQ' THEN '&symbol=QQQ' ELSE '' END,NEW.id
 FROM profiles p LEFT JOIN user_preferences pref ON pref.user_id=p.user_id
 WHERE public.vault_access_for_user(p.user_id) AND coalesce(pref.notifications_enabled,true) AND coalesce(pref.notify_pulse,true)
 AND public.pulse_symbol_opted_in(NEW.body->>'symbol',pref.notify_pulse_spy,pref.notify_pulse_qqq)
 AND NOT EXISTS (SELECT 1 FROM academy_notifications prior JOIN pulse_spy_events previous_event ON previous_event.id=prior.source_pulse_id WHERE prior.user_id=p.user_id AND prior.type='pulse_zone' AND previous_event.body->>'symbol'=NEW.body->>'symbol' AND previous_event.body->>'zoneId'=NEW.body->>'zoneId' AND previous_event.body->>'kind'=NEW.body->>'kind' AND previous_event.timeframe=NEW.timeframe AND prior.created_at>now()-interval '5 minutes')
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END; $function$
;
