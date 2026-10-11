-- $49 private mentoring: one durable entitlement per verified payment, persisted single-use
-- Calendly link, outbox for the branded booking email (sent by a GHL workflow via tag).
CREATE TABLE IF NOT EXISTS public.vault_mentoring_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id text NOT NULL UNIQUE,
  stripe_charge_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  ghl_order_id text NOT NULL UNIQUE,
  ghl_transaction_id text NOT NULL UNIQUE,
  ghl_contact_id text,
  ghl_location_id text NOT NULL,
  ghl_product_id text NOT NULL,
  ghl_price_id text NOT NULL,
  email text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  livemode boolean NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  auth_user_id uuid,
  claimed_at timestamptz,
  calendly_event_type_uri text NOT NULL,
  link_attempt_started_at timestamptz,
  calendly_link_url text,
  calendly_link_created_at timestamptz,
  booked_event_uri text,
  booked_start_at timestamptz,
  reschedule_count integer NOT NULL DEFAULT 0,
  staff_review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vault_mentoring_status_chk CHECK (status IN
    ('paid','link_ready','sent','booked','completed','canceled_by_member','canceled_by_coach','refunded','withheld')),
  CONSTRAINT vault_mentoring_proof_chk CHECK (amount_cents = 4900 AND currency = 'usd'
    AND btrim(email) <> '' AND email = lower(btrim(email))),
  CONSTRAINT vault_mentoring_reschedule_chk CHECK (reschedule_count BETWEEN 0 AND 1)
);
GRANT ALL ON public.vault_mentoring_entitlements TO service_role;
REVOKE ALL ON public.vault_mentoring_entitlements FROM PUBLIC, anon, authenticated;
ALTER TABLE public.vault_mentoring_entitlements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS vault_mentoring_entitlements_email_idx ON public.vault_mentoring_entitlements(email);
CREATE INDEX IF NOT EXISTS vault_mentoring_entitlements_user_idx ON public.vault_mentoring_entitlements(auth_user_id);

CREATE TABLE IF NOT EXISTS public.vault_mentoring_outbox (
  entitlement_id uuid PRIMARY KEY REFERENCES public.vault_mentoring_entitlements(id),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','sent','withheld')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vault_mentoring_outbox TO service_role;
REVOKE ALL ON public.vault_mentoring_outbox FROM PUBLIC, anon, authenticated;
ALTER TABLE public.vault_mentoring_outbox ENABLE ROW LEVEL SECURITY;

-- Atomic entitlement + outbox. Exact replay = false (no-op); any differing proof errors.
CREATE OR REPLACE FUNCTION public.record_vault_mentoring_payment(
  p_payment_intent text, p_charge text, p_customer text, p_order text, p_transaction text,
  p_contact text, p_location text, p_product text, p_price text, p_email text,
  p_amount integer, p_currency text, p_livemode boolean, p_event_type text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e text := lower(btrim(coalesce(p_email,''))); r public.vault_mentoring_entitlements; new_id uuid;
BEGIN
  IF coalesce(p_payment_intent,'')='' OR coalesce(p_charge,'')='' OR coalesce(p_customer,'')='' OR coalesce(p_order,'')=''
     OR coalesce(p_transaction,'')='' OR e='' OR p_amount IS DISTINCT FROM 4900 OR p_currency IS DISTINCT FROM 'usd'
     OR coalesce(p_event_type,'')='' THEN
    RAISE EXCEPTION 'mentoring payment proof incomplete';
  END IF;
  INSERT INTO public.vault_mentoring_entitlements(stripe_payment_intent_id, stripe_charge_id, stripe_customer_id, ghl_order_id,
    ghl_transaction_id, ghl_contact_id, ghl_location_id, ghl_product_id, ghl_price_id, email, amount_cents, currency, livemode, calendly_event_type_uri)
  VALUES (p_payment_intent, p_charge, p_customer, p_order, p_transaction, nullif(p_contact,''), p_location, p_product, p_price, e,
    p_amount, p_currency, p_livemode, p_event_type)
  ON CONFLICT DO NOTHING RETURNING id INTO new_id;
  IF new_id IS NOT NULL THEN
    INSERT INTO public.vault_mentoring_outbox(entitlement_id) VALUES (new_id);
    RETURN true;
  END IF;
  SELECT * INTO r FROM public.vault_mentoring_entitlements
   WHERE stripe_payment_intent_id=p_payment_intent OR stripe_charge_id=p_charge OR ghl_order_id=p_order OR ghl_transaction_id=p_transaction
   LIMIT 1;
  IF r.id IS NULL OR r.stripe_payment_intent_id<>p_payment_intent OR r.stripe_charge_id<>p_charge OR r.stripe_customer_id<>p_customer
     OR r.ghl_order_id<>p_order OR r.ghl_transaction_id<>p_transaction OR r.email<>e OR r.ghl_location_id<>p_location
     OR r.ghl_product_id<>p_product OR r.ghl_price_id<>p_price OR r.livemode<>p_livemode THEN
    RAISE EXCEPTION 'mentoring payment conflicts with an existing entitlement';
  END IF;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.record_vault_mentoring_payment(text,text,text,text,text,text,text,text,text,text,integer,text,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_vault_mentoring_payment(text,text,text,text,text,text,text,text,text,text,integer,text,boolean,text) TO service_role;

-- Refund or dispute: entitlement ends; any unsent booking email is withheld. Booked/link state kept for audit.
CREATE OR REPLACE FUNCTION public.mark_vault_mentoring_refunded(p_payment_intent text, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eid uuid;
BEGIN
  UPDATE public.vault_mentoring_entitlements SET status=CASE WHEN p_reason='dispute' THEN 'withheld' ELSE 'refunded' END,
    staff_review_reason=left('payment '||coalesce(p_reason,'refund'),120), updated_at=now()
   WHERE stripe_payment_intent_id=p_payment_intent AND status NOT IN ('refunded') RETURNING id INTO eid;
  IF eid IS NULL THEN RETURN false; END IF;
  UPDATE public.vault_mentoring_outbox SET state='withheld', locked_until=NULL, last_error='withheld: payment reversed'
   WHERE entitlement_id=eid AND state<>'sent';
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_vault_mentoring_refunded(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_vault_mentoring_refunded(text,text) TO service_role;

-- Outstanding = paid but not yet booked/closed. Used by the capacity guard.
CREATE OR REPLACE FUNCTION public.vault_mentoring_outstanding_count(p_exclude uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT count(*)::int FROM public.vault_mentoring_entitlements
   WHERE status IN ('paid','link_ready','sent') AND id IS DISTINCT FROM p_exclude;
$$;
REVOKE ALL ON FUNCTION public.vault_mentoring_outstanding_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_mentoring_outstanding_count(uuid) TO service_role;

-- One-shot link creation guard: true exactly once per entitlement. A started attempt without a
-- stored URL means an ambiguous provider response; it is never retried automatically.
CREATE OR REPLACE FUNCTION public.begin_vault_mentoring_link(p_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH u AS (UPDATE public.vault_mentoring_entitlements SET link_attempt_started_at=now(), updated_at=now()
    WHERE id=p_id AND status='paid' AND link_attempt_started_at IS NULL AND calendly_link_url IS NULL RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;
REVOKE ALL ON FUNCTION public.begin_vault_mentoring_link(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_vault_mentoring_link(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_vault_mentoring_jobs()
RETURNS SETOF public.vault_mentoring_outbox LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.vault_mentoring_outbox o SET state='processing', attempts=o.attempts+1, locked_until=now()+interval '5 minutes'
   WHERE o.entitlement_id IN (SELECT entitlement_id FROM public.vault_mentoring_outbox
     WHERE state='pending' AND next_attempt_at<=now() AND (locked_until IS NULL OR locked_until<now())
     ORDER BY next_attempt_at LIMIT 20 FOR UPDATE SKIP LOCKED)
  RETURNING o.*;
$$;
REVOKE ALL ON FUNCTION public.claim_vault_mentoring_jobs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vault_mentoring_jobs() TO service_role;

-- Member booking access: binds only with a fresh email-link (OTP) session whose email matches the
-- purchase email (email_confirmed_at alone is not inbox proof). Returns only the caller's own rows.
CREATE OR REPLACE FUNCTION public.get_my_vault_mentoring()
RETURNS TABLE(id uuid, status text, booking_url text, booked_start_at timestamptz, reschedule_count integer, purchased_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); jwt_email text := lower(btrim(coalesce(auth.jwt()->>'email',''))); sid uuid;
BEGIN
  IF uid IS NULL OR coalesce(auth.jwt()->>'role','')<>'authenticated' THEN RETURN; END IF;
  IF jwt_email<>'' AND EXISTS (SELECT 1 FROM auth.users u JOIN public.profiles p ON p.user_id=u.id
      WHERE u.id=uid AND lower(btrim(u.email))=jwt_email AND coalesce(p.is_banned,false)=false
        AND coalesce(p.access_status,'') NOT IN ('banned','revoked')) THEN
    BEGIN sid := nullif(auth.jwt()->>'session_id','')::uuid; EXCEPTION WHEN others THEN sid := NULL; END;
    IF sid IS NOT NULL AND EXISTS (SELECT 1 FROM auth.sessions s JOIN auth.mfa_amr_claims c ON c.session_id=s.id
        WHERE s.id=sid AND s.user_id=uid AND c.authentication_method='otp' AND c.created_at>now()-interval '15 minutes') THEN
      UPDATE public.vault_mentoring_entitlements m SET auth_user_id=uid, claimed_at=now(), updated_at=now()
       WHERE m.email=jwt_email AND m.auth_user_id IS NULL;
    END IF;
  END IF;
  RETURN QUERY SELECT m.id, m.status,
    CASE WHEN m.status IN ('link_ready','sent') THEN m.calendly_link_url END,
    m.booked_start_at, m.reschedule_count, m.created_at
   FROM public.vault_mentoring_entitlements m WHERE m.auth_user_id=uid ORDER BY m.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_vault_mentoring() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_vault_mentoring() TO authenticated, service_role;
