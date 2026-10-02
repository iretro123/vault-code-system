-- Paid introductory entitlement and durable CRM outbox. No public billing rows.
CREATE TABLE public.vault_return_memberships (
  stripe_subscription_id text PRIMARY KEY,
  checkout_session_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  email text NOT NULL,
  auth_user_id uuid REFERENCES auth.users(id),
  status text NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  access_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.vault_return_memberships(email);
ALTER TABLE public.vault_return_memberships ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.vault_onboarding_outbox (
  stripe_subscription_id text PRIMARY KEY REFERENCES public.vault_return_memberships(stripe_subscription_id),
  email text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  last_error text,
  sent_at timestamptz
);
ALTER TABLE public.vault_onboarding_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vault_return_memberships, public.vault_onboarding_outbox FROM anon,authenticated;
GRANT ALL ON public.vault_return_memberships, public.vault_onboarding_outbox TO service_role;

CREATE FUNCTION public.record_vault_return_payment(p_subscription text,p_checkout text,p_customer text,p_email text,p_status text,p_end timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.vault_return_memberships(stripe_subscription_id,checkout_session_id,stripe_customer_id,email,status,access_until)
  VALUES(p_subscription,p_checkout,p_customer,lower(btrim(p_email)),p_status,p_end)
  ON CONFLICT(stripe_subscription_id) DO NOTHING;
  -- Preserve current status on a replay; do not reactivate expired/canceled membership.
  INSERT INTO public.vault_onboarding_outbox(stripe_subscription_id,email)
  VALUES(p_subscription,lower(btrim(p_email))) ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.record_vault_return_payment(text,text,text,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_vault_return_payment(text,text,text,text,text,timestamptz) TO service_role;

CREATE FUNCTION public.claim_vault_return_membership()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE matched integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM auth.users u JOIN public.profiles p ON p.user_id=u.id
    WHERE u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL
    AND coalesce(p.is_banned,false)=false AND coalesce(p.access_status,'') NOT IN ('banned','revoked')) THEN
    RETURN false;
  END IF;
  UPDATE public.vault_return_memberships m SET auth_user_id=auth.uid(),updated_at=now()
  FROM auth.users u WHERE u.id=auth.uid() AND lower(btrim(u.email))=m.email
    AND (m.auth_user_id IS NULL OR m.auth_user_id=u.id)
    AND m.status IN ('active','trialing') AND m.access_until>now();
  GET DIAGNOSTICS matched = ROW_COUNT;
  RETURN matched>0;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_vault_return_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_vault_return_membership() TO authenticated,service_role;

CREATE FUNCTION public.claim_vault_onboarding_jobs()
RETURNS SETOF public.vault_onboarding_outbox LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.vault_onboarding_outbox o SET state='processing',locked_until=now()+interval '5 minutes',attempts=o.attempts+1
  WHERE o.stripe_subscription_id IN (
    SELECT q.stripe_subscription_id FROM public.vault_onboarding_outbox q
    WHERE q.state<>'sent' AND q.next_attempt_at<=now() AND (q.locked_until IS NULL OR q.locked_until<now())
    ORDER BY q.next_attempt_at LIMIT 25 FOR UPDATE SKIP LOCKED
  ) RETURNING o.*;
$$;
REVOKE ALL ON FUNCTION public.claim_vault_onboarding_jobs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_vault_onboarding_jobs() TO service_role;

-- One decision for navigation, RLS, and billing recovery. Roles alone never
-- prove payment. Ban checks run before whitelist and staff exemptions.
CREATE OR REPLACE FUNCTION public.vault_access_for_user(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u JOIN public.profiles p ON p.user_id=u.id
    WHERE u.id=uid AND coalesce(p.is_banned,false)=false
      AND coalesce(p.access_status,'') NOT IN ('banned','revoked')
      AND (
        EXISTS (SELECT 1 FROM public.allowed_signups a
          WHERE lower(btrim(a.email))=lower(btrim(u.email)))
        OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=uid
          AND r.role::text IN ('operator','vault_os_owner'))
        OR EXISTS (SELECT 1 FROM public.academy_user_roles ar
          JOIN public.academy_roles r ON r.id=ar.role_id
          WHERE ar.user_id=uid AND r.name IN ('CEO','Admin','Coach'))
        OR EXISTS (SELECT 1 FROM public.students s
          JOIN public.student_access sa ON sa.user_id=s.id
          WHERE s.auth_user_id=uid AND sa.status='active'
            AND sa.product_key IN ('vault_os','vault_academy')
            AND sa.stripe_subscription_id IS NOT NULL
            AND sa.stripe_customer_id IS NOT NULL)
        OR EXISTS (SELECT 1 FROM public.vault_return_memberships m
          WHERE m.auth_user_id=uid AND m.paid_at IS NOT NULL
            AND m.status IN ('active','trialing') AND m.access_until>now())
        OR EXISTS (SELECT 1 FROM public.ios_membership_activations a
          WHERE a.user_id=uid AND a.expires_date>now()
            AND a.metadata->>'apple_verified'='true'
            AND a.metadata->>'revocation_date' IS NULL)
        OR EXISTS (SELECT 1 FROM public.android_membership_activations a
          WHERE a.user_id=uid AND a.expires_date>now()
            AND a.subscription_state IN ('SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_CANCELED'))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.vault_access_for_user(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.vault_access_for_user(uuid) TO service_role;
