CREATE FUNCTION public.pulse_spy_capture_watchdog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.pulse_spy_config%ROWTYPE; issue bigint; ny timestamp:=now() AT TIME ZONE 'America/New_York';
BEGIN
  SELECT * INTO STRICT cfg FROM public.pulse_spy_config WHERE id;
  IF NOT cfg.enabled OR NOT cfg.capture_enabled OR extract(isodow FROM ny)>5 OR ny::time<'09:03' OR ny::time>='16:00' THEN RETURN; END IF;
  IF cfg.capture_checked_at IS NULL OR cfg.capture_checked_at<now()-interval '3 minutes' THEN
    UPDATE public.pulse_spy_config SET capture_connected=false WHERE id;
    INSERT INTO public.pulse_spy_incidents(timeframe,kind,message) VALUES(0,'capture','Hosted SPY chart checks stopped. Zone alerts have a separate connection.')
      ON CONFLICT(timeframe,kind) WHERE resolved_at IS NULL DO NOTHING RETURNING id INTO issue;
    IF issue IS NOT NULL THEN
      INSERT INTO public.academy_notifications(user_id,type,title,body,link_path)
        SELECT DISTINCT ar.user_id,'announcement','Pulse chart capture needs attention','Hosted chart checks stopped. Check Cloudflare and the TradingView login.','/academy/community?tab=pulse'
        FROM public.academy_user_roles ar JOIN public.academy_roles r ON r.id=ar.role_id WHERE r.name='CEO';
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_spy_capture_watchdog() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_spy_capture_watchdog() TO service_role;
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='vault-spy-pulse-health'),command:='SELECT public.pulse_spy_watchdog(); SELECT public.pulse_spy_capture_watchdog()');
