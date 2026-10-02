-- Follow-up to 0002: the claim session itself must still exist in auth.sessions
-- (revoked/unknown claim sessions are denied), and the already-bound
-- idempotent report of claim_vault_return_membership() only returns true for
-- a session that canonical access would also accept.
CREATE OR REPLACE FUNCTION public.vault_return_caller_session_ok(p_uid uuid, p_claim_session uuid, p_claimed_at timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid;
BEGIN
  IF coalesce(auth.jwt()->>'role','') <> 'authenticated' OR auth.uid() IS DISTINCT FROM p_uid THEN
    RETURN true;
  END IF;
  BEGIN sid := nullif(auth.jwt()->>'session_id','')::uuid;
  EXCEPTION WHEN others THEN RETURN false; END;
  IF sid IS NULL OR p_claimed_at IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM auth.sessions s
    WHERE s.id=sid AND s.user_id=p_uid
      AND (s.id = p_claim_session OR s.created_at >= p_claimed_at));
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

  -- Nothing new to bind: report access only if THIS session may use it.
  IF NOT EXISTS (SELECT 1 FROM public.vault_return_memberships m
      WHERE m.email=jwt_email AND m.status IN ('active','trialing') AND m.access_until>now()
        AND (m.auth_user_id IS NULL OR (m.auth_user_id=uid AND m.claimed_at IS NULL))) THEN
    RETURN EXISTS (SELECT 1 FROM public.vault_return_memberships m
      WHERE m.auth_user_id=uid AND m.claimed_at IS NOT NULL AND m.email=jwt_email
        AND m.status IN ('active','trialing') AND m.access_until>now()
        AND public.vault_return_caller_session_ok(uid, m.claim_session_id, m.claimed_at));
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