-- Preserve sanitized failure codes atomically with the fenced acknowledgement.
CREATE OR REPLACE FUNCTION public.finish_vault_push_job(job_id uuid,lease_token uuid,outcome text,failure_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE changed integer; safe_code text;
BEGIN
 IF outcome NOT IN ('sent','skipped','retry','dead') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 safe_code:=CASE WHEN failure_code ~ '^(apns|fcm|web):(configuration|[0-9]{3})(:[A-Za-z]{1,64})?$'
  OR failure_code IN ('provider_timeout','delivery_exception','provider_rejected') THEN failure_code ELSE NULL END;
 UPDATE notification_push_jobs SET state=CASE WHEN outcome='retry' THEN CASE WHEN attempts>=6 THEN 'dead' ELSE 'pending' END ELSE outcome END,
 available_at=now()+make_interval(secs=>least(900,(15*power(2,attempts))::integer)),lease_until=NULL,claim_token=NULL,
 finished_at=CASE WHEN outcome IN ('sent','skipped','dead') OR attempts>=6 THEN now() ELSE NULL END,
 last_error=CASE WHEN outcome IN ('retry','dead') THEN coalesce(safe_code,CASE WHEN outcome='retry' THEN 'provider_retry' ELSE 'permanent_failure' END) ELSE last_error END
 WHERE id=job_id AND state='processing' AND claim_token=lease_token AND lease_until>now();
 GET DIAGNOSTICS changed=ROW_COUNT; RETURN changed=1;
END; $$;
REVOKE ALL ON FUNCTION public.finish_vault_push_job(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_vault_push_job(uuid,uuid,text,text) TO service_role;
-- Older senders remain compatible while deployment rolls forward.
CREATE OR REPLACE FUNCTION public.finish_vault_push_job(job_id uuid,lease_token uuid,outcome text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT public.finish_vault_push_job(job_id,lease_token,outcome,NULL);
$$;
REVOKE ALL ON FUNCTION public.finish_vault_push_job(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_vault_push_job(uuid,uuid,text) TO service_role;
