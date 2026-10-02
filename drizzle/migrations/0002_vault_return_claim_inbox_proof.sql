-- Paid return claim requires FRESH inbox-ownership proof, enforced in SQL so a
-- direct authenticated RPC cannot bypass the edge function.
-- Why: email auto-confirm is ON, so auth.users.email_confirmed_at is set for
-- password sign-ups that never proved inbox ownership.
-- Proof = (a) the caller's CURRENT session was created by an email OTP / magic
-- link (auth.mfa_amr_claims.authentication_method='otp') within 15 minutes, and
-- (b) the server prepared that exact session (replaced any pre-existing password
-- and revoked every other session) within 15 minutes.
-- Sessions that existed before the bind never inherit the new membership.
-- Additive only; other entitlement sources are unchanged.

ALTER TABLE public.vault_return_memberships
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_session_id uuid;

CREATE TABLE IF NOT EXISTS public.vault_return_claim_proofs (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  prepared_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vault_return_claim_proofs TO service_role;
REVOKE ALL ON public.vault_return_claim_proofs FROM anon, authenticated;
ALTER TABLE public.vault_return_claim_proofs ENABLE ROW LEVEL SECURITY;

-- True unless an authenticated caller checks THEIR OWN return access from a
-- session that predates the bind and is not the claiming session.
CREATE OR REPLACE FUNCTION public.vault_return_caller_session_ok(p_uid uuid, p_claim_session uuid, p_claimed_at timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid;
BEGIN
  IF coalesce(auth.jwt()->>'role','') <> 'authenticated' OR auth.uid() IS DISTINCT FROM p_uid THEN
    RETURN true;
  END IF;
  BEGIN sid := nullif(auth.jwt()->>'session_id','')::uuid;
  EXCEPTION WHEN others THEN RETURN false; END;
  IF sid IS NULL THEN RETURN false; END IF;
  IF sid = p_claim_session THEN RETURN true; END IF;
  RETURN EXISTS (SELECT 1 FROM auth.sessions s
    WHERE s.id=sid AND s.user_id=p_uid AND s.created_at >= p_claimed_at);
END;
$$;
REVOKE ALL ON FUNCTION public.vault_return_caller_session_ok(uuid,uuid,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_return_caller_session_ok(uuid,uuid,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_vault_return_membership()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  sid uuid;
  jwt_email text := lower(btrim(coalesce(auth.jwt()->>'email','')));
  matched integer;
BEGIN
  IF uid IS NULL OR coalesce(auth.jwt()->>'role','') <> 'authenticated' OR jwt_email = '' THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u JOIN public.profiles p ON p.user_id=u.id
    WHERE u.id=uid AND u.email_confirmed_at IS NOT NULL AND lower(btrim(u.email))=jwt_email
      AND coalesce(p.is_banned,false)=false
      AND coalesce(p.access_status,'') NOT IN ('banned','revoked')) THEN
    RETURN false;
  END IF;

  -- Nothing new to bind: report already-proven access idempotently.
  IF NOT EXISTS (SELECT 1 FROM public.vault_return_memberships m
      WHERE m.email=jwt_email AND m.status IN ('active','trialing') AND m.access_until>now()
        AND (m.auth_user_id IS NULL OR (m.auth_user_id=uid AND m.claimed_at IS NULL))) THEN
    RETURN EXISTS (SELECT 1 FROM public.vault_return_memberships m
      WHERE m.auth_user_id=uid AND m.claimed_at IS NOT NULL AND m.email=jwt_email
        AND m.status IN ('active','trialing') AND m.access_until>now());
  END IF;

  BEGIN sid := nullif(auth.jwt()->>'session_id','')::uuid;
  EXCEPTION WHEN others THEN RETURN false; END;
  IF sid IS NULL OR NOT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.id=sid AND s.user_id=uid) THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.mfa_amr_claims c
      WHERE c.session_id=sid AND c.authentication_method='otp'
        AND c.created_at > now() - interval '15 minutes') THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vault_return_claim_proofs pr
      WHERE pr.session_id=sid AND pr.user_id=uid AND pr.email=jwt_email
        AND pr.prepared_at > now() - interval '15 minutes') THEN
    RETURN false;
  END IF;

  UPDATE public.vault_return_memberships m
     SET auth_user_id=uid, claimed_at=now(), claim_session_id=sid, updated_at=now()
   WHERE m.email=jwt_email AND m.status IN ('active','trialing') AND m.access_until>now()
     AND (m.auth_user_id IS NULL OR (m.auth_user_id=uid AND m.claimed_at IS NULL));
  GET DIAGNOSTICS matched = ROW_COUNT;
  DELETE FROM public.vault_return_claim_proofs WHERE session_id=sid;
  RETURN matched>0;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_vault_return_membership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_vault_return_membership() TO authenticated, service_role;

-- Identical to the live definition except the return-membership clause now
-- requires a proven claim and rejects the caller's pre-bind sessions.
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
          WHERE m.auth_user_id=uid AND m.paid_at IS NOT NULL AND m.claimed_at IS NOT NULL
            AND m.status IN ('active','trialing') AND m.access_until>now()
            AND public.vault_return_caller_session_ok(uid, m.claim_session_id, m.claimed_at))
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
REVOKE ALL ON FUNCTION public.vault_access_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_access_for_user(uuid) TO service_role;