ALTER TABLE public.vault_return_memberships
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'stripe_payment_link',
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS ghl_location_id text,
  ADD COLUMN IF NOT EXISTS ghl_order_id text,
  ADD COLUMN IF NOT EXISTS intro_amount_cents integer;

ALTER TABLE public.vault_return_memberships ALTER COLUMN checkout_session_id DROP NOT NULL;

ALTER TABLE public.vault_return_memberships DROP CONSTRAINT IF EXISTS vault_return_memberships_source_proof;
ALTER TABLE public.vault_return_memberships ADD CONSTRAINT vault_return_memberships_source_proof CHECK (
  (source = 'stripe_payment_link' AND checkout_session_id IS NOT NULL)
  OR (source = 'ghl_native_invoice' AND checkout_session_id IS NULL
      AND stripe_invoice_id IS NOT NULL AND stripe_payment_intent_id IS NOT NULL
      AND stripe_price_id IS NOT NULL AND ghl_location_id IS NOT NULL
      AND intro_amount_cents = 199)
);
CREATE UNIQUE INDEX IF NOT EXISTS vault_return_memberships_invoice_uniq
  ON public.vault_return_memberships(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vault_return_memberships_payment_intent_uniq
  ON public.vault_return_memberships(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_vault_ghl_invoice_payment(
  p_subscription text, p_invoice text, p_payment_intent text, p_customer text, p_email text,
  p_status text, p_end timestamptz, p_price text, p_location text, p_order text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted integer;
BEGIN
  IF p_status NOT IN ('trialing','active') OR p_end IS NULL OR p_end <= now()
     OR coalesce(btrim(p_email),'') = '' OR coalesce(p_invoice,'') = '' OR coalesce(p_payment_intent,'') = '' THEN
    RAISE EXCEPTION 'GHL invoice payment proof incomplete';
  END IF;
  INSERT INTO public.vault_return_memberships(
    stripe_subscription_id, checkout_session_id, stripe_customer_id, email, status, access_until,
    source, stripe_invoice_id, stripe_payment_intent_id, stripe_price_id, ghl_location_id, ghl_order_id, intro_amount_cents)
  VALUES (p_subscription, NULL, p_customer, lower(btrim(p_email)), p_status, p_end,
    'ghl_native_invoice', p_invoice, p_payment_intent, p_price, p_location, nullif(p_order,''), 199)
  ON CONFLICT (stripe_subscription_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  INSERT INTO public.vault_onboarding_outbox(stripe_subscription_id, email)
  VALUES (p_subscription, lower(btrim(p_email))) ON CONFLICT DO NOTHING;
  RETURN inserted > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.record_vault_ghl_invoice_payment(text,text,text,text,text,text,timestamptz,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_vault_ghl_invoice_payment(text,text,text,text,text,text,timestamptz,text,text,text) TO service_role;