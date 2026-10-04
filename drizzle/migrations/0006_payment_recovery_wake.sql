CREATE OR REPLACE FUNCTION public.vault_payment_recovery_wake()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text := 'pr' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  DELETE FROM public.vault_onboarding_wake_tokens WHERE created_at < now() - interval '10 minutes';
  -- No HTTP call while no recovery job is due.
  IF NOT EXISTS (SELECT 1 FROM public.vault_payment_recovery_outbox o
      WHERE o.state <> 'sent' AND o.next_attempt_at <= now()
        AND (o.locked_until IS NULL OR o.locked_until < now())) THEN
    RETURN;
  END IF;
  INSERT INTO public.vault_onboarding_wake_tokens(token) VALUES (t);
  PERFORM net.http_post(
    url := 'https://oemylhcjqncovnmvvgxh.supabase.co/functions/v1/sync-vault-payment-recovery',
    headers := jsonb_build_object('Content-Type','application/json','x-vault-recovery-wake', t),
    body := '{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.vault_payment_recovery_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_payment_recovery_wake() TO service_role;

-- Wake the worker when a job is enqueued; never fail the enqueue itself.
CREATE OR REPLACE FUNCTION public.vault_payment_recovery_enqueue_wake()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  BEGIN PERFORM public.vault_payment_recovery_wake();
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'payment recovery wake failed: %', SQLERRM; END;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.vault_payment_recovery_enqueue_wake() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS vault_payment_recovery_outbox_wake ON public.vault_payment_recovery_outbox;
CREATE TRIGGER vault_payment_recovery_outbox_wake
  AFTER INSERT ON public.vault_payment_recovery_outbox
  FOR EACH STATEMENT EXECUTE FUNCTION public.vault_payment_recovery_enqueue_wake();

-- Hourly retry backstop; makes no HTTP call unless a job is due.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'vault-payment-recovery-retry-hourly';
  PERFORM cron.schedule('vault-payment-recovery-retry-hourly', '47 * * * *', 'SELECT public.vault_payment_recovery_wake()');
END $$;