-- Paid-role revocation (Stripe access ended) writes access_status='inactive' (Free Basic tier, not blocked).
-- The validator predates that state and rejected it, failing invoice.payment_failed / subscription.updated webhooks.
CREATE OR REPLACE FUNCTION public.validate_access_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.access_status NOT IN ('trial', 'active', 'inactive', 'revoked') THEN
    RAISE EXCEPTION 'Invalid access_status: %. Must be trial, active, inactive, or revoked.', NEW.access_status;
  END IF;
  RETURN NEW;
END;
$function$;