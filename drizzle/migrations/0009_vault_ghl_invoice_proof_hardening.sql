ALTER TABLE public.vault_return_memberships DROP CONSTRAINT IF EXISTS vault_return_memberships_source_proof;
ALTER TABLE public.vault_return_memberships ADD CONSTRAINT vault_return_memberships_source_proof CHECK (
  (source = 'stripe_payment_link' AND checkout_session_id IS NOT NULL)
  OR (source = 'ghl_native_invoice' AND checkout_session_id IS NULL
      AND stripe_invoice_id IS NOT NULL AND stripe_payment_intent_id IS NOT NULL
      AND stripe_price_id IS NOT NULL AND ghl_location_id IS NOT NULL
      AND intro_amount_cents IS NOT NULL AND intro_amount_cents = 199)
);

CREATE OR REPLACE FUNCTION public.record_vault_ghl_invoice_payment(
  p_subscription text, p_invoice text, p_payment_intent text, p_customer text, p_email text,
  p_status text, p_end timestamptz, p_price text, p_location text, p_order text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted integer; m public.vault_return_memberships%ROWTYPE; v_email text := lower(btrim(coalesce(p_email,'')));
BEGIN
  IF p_status NOT IN ('trialing','active') OR p_end IS NULL OR p_end <= now()
     OR v_email = '' OR coalesce(p_subscription,'') = '' OR coalesce(p_invoice,'') = ''
     OR coalesce(p_payment_intent,'') = '' OR coalesce(p_customer,'') = '' THEN
    RAISE EXCEPTION 'GHL invoice payment proof incomplete';
  END IF;
  INSERT INTO public.vault_return_memberships(
    stripe_subscription_id, checkout_session_id, stripe_customer_id, email, status, access_until,
    source, stripe_invoice_id, stripe_payment_intent_id, stripe_price_id, ghl_location_id, ghl_order_id, intro_amount_cents)
  VALUES (p_subscription, NULL, p_customer, v_email, p_status, p_end,
    'ghl_native_invoice', p_invoice, p_payment_intent, p_price, p_location, nullif(p_order,''), 199)
  ON CONFLICT (stripe_subscription_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN
    -- Replay must carry identical proof; anything else fails without touching the outbox.
    SELECT * INTO m FROM public.vault_return_memberships WHERE stripe_subscription_id = p_subscription FOR UPDATE;
    IF m.source IS DISTINCT FROM 'ghl_native_invoice' OR m.stripe_invoice_id IS DISTINCT FROM p_invoice
       OR m.stripe_payment_intent_id IS DISTINCT FROM p_payment_intent OR m.stripe_customer_id IS DISTINCT FROM p_customer
       OR m.email IS DISTINCT FROM v_email OR m.stripe_price_id IS DISTINCT FROM p_price OR m.ghl_location_id IS DISTINCT FROM p_location THEN
      RAISE EXCEPTION 'GHL invoice proof conflicts with existing membership';
    END IF;
    RETURN false;
  END IF;
  INSERT INTO public.vault_onboarding_outbox(stripe_subscription_id, email)
  VALUES (p_subscription, v_email) ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.record_vault_ghl_invoice_payment(text,text,text,text,text,text,timestamptz,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_vault_ghl_invoice_payment(text,text,text,text,text,text,timestamptz,text,text,text) TO service_role;