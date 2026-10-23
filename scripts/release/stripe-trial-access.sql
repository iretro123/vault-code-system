-- Existing Stripe-linked trials qualify; GHL invoice offers retain their
-- separate verified-payment + inbox-claim path. No membership data rewrites.
CREATE OR REPLACE FUNCTION public.vault_access_for_user(uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u JOIN public.profiles p ON p.user_id=u.id
    WHERE u.id=uid AND coalesce(p.is_banned,false)=false
      AND coalesce(p.access_status,'') NOT IN ('banned','revoked')
      AND (
        EXISTS (SELECT 1 FROM public.allowed_signups a
          WHERE lower(btrim(a.email))=lower(btrim(u.email))
            AND nullif(btrim(coalesce(a.stripe_customer_id,'')),'') IS NULL)
        OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=uid
          AND r.role::text IN ('operator','vault_os_owner'))
        OR EXISTS (SELECT 1 FROM public.academy_user_roles ar
          JOIN public.academy_roles r ON r.id=ar.role_id
          WHERE ar.user_id=uid AND r.name IN ('CEO','Admin','Coach'))
        OR EXISTS (SELECT 1 FROM public.students s
          JOIN public.student_access sa ON sa.user_id=s.id
          WHERE s.auth_user_id=uid
            AND (sa.status='active' OR (
              sa.status='trialing'
              AND nullif(btrim(sa.stripe_price_id),'') IS NOT NULL
              AND sa.stripe_price_id NOT IN (
                'price_1UOqHXAMsd1FtcvLBM7QdEOz',
                'price_1UR1FcAMsd1FtcvLgvyx0GFO',
                'price_1UR1DwAMsd1FtcvL2q3fUjQE')
              AND NOT EXISTS (SELECT 1 FROM public.vault_return_memberships g
                WHERE g.stripe_subscription_id=sa.stripe_subscription_id
                  AND g.source='ghl_native_invoice')
            ))
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