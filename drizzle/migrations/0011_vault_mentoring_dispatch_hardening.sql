-- "Tag applied" is a dispatch to the GHL workflow, not proof of email receipt.
ALTER TABLE public.vault_mentoring_entitlements DROP CONSTRAINT IF EXISTS vault_mentoring_status_chk;
ALTER TABLE public.vault_mentoring_entitlements ADD CONSTRAINT vault_mentoring_status_chk CHECK (status IN
  ('paid','link_ready','dispatched','booked','completed','canceled_by_member','canceled_by_coach','refunded','withheld'));
ALTER TABLE public.vault_mentoring_outbox DROP CONSTRAINT IF EXISTS vault_mentoring_outbox_state_check;
ALTER TABLE public.vault_mentoring_outbox ADD CONSTRAINT vault_mentoring_outbox_state_check CHECK (state IN ('pending','processing','dispatched','withheld'));
ALTER TABLE public.vault_mentoring_outbox ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;
COMMENT ON COLUMN public.vault_mentoring_outbox.sent_at IS 'DEPRECATED: replaced by dispatched_at (tag dispatch is not email receipt)';
ALTER TABLE public.vault_mentoring_entitlements
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_calendly_event_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_vault_mentoring_refunded(p_payment_intent text, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eid uuid;
BEGIN
  UPDATE public.vault_mentoring_entitlements SET status=CASE WHEN p_reason='dispute' THEN 'withheld' ELSE 'refunded' END,
    staff_review_reason=left('payment '||coalesce(p_reason,'refund'),120), updated_at=now()
   WHERE stripe_payment_intent_id=p_payment_intent AND status NOT IN ('refunded') RETURNING id INTO eid;
  IF eid IS NULL THEN RETURN false; END IF;
  UPDATE public.vault_mentoring_outbox SET state='withheld', locked_until=NULL, last_error='withheld: payment reversed'
   WHERE entitlement_id=eid AND state<>'dispatched';
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_mentoring_outstanding_count(p_exclude uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT count(*)::int FROM public.vault_mentoring_entitlements
   WHERE status IN ('paid','link_ready','dispatched') AND id IS DISTINCT FROM p_exclude;
$$;

-- Booked session starts, for the weekly session cap.
CREATE OR REPLACE FUNCTION public.vault_mentoring_booked_starts(p_from timestamptz, p_to timestamptz)
RETURNS SETOF timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT booked_start_at FROM public.vault_mentoring_entitlements
   WHERE status='booked' AND booked_start_at >= p_from AND booked_start_at < p_to;
$$;
REVOKE ALL ON FUNCTION public.vault_mentoring_booked_starts(timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_mentoring_booked_starts(timestamptz,timestamptz) TO service_role;

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
    CASE WHEN m.status IN ('link_ready','dispatched') THEN m.calendly_link_url END,
    m.booked_start_at, m.reschedule_count, m.created_at
   FROM public.vault_mentoring_entitlements m WHERE m.auth_user_id=uid ORDER BY m.created_at DESC;
END;
$$;
