-- STAGED, NOT APPLIED. Apply through the migration tool only after review.
-- Past-due payment lock (owner policy): a formerly paid Stripe member whose
-- relevant membership is past_due loses ALL member content, including the free
-- community/lesson/calendar areas, until Stripe reports the subscription
-- active again. Independent valid access (whitelist, staff, another active
-- Stripe subscription, verified native purchase, valid return membership)
-- always wins: vault_access_for_user() is checked first.
-- Additive only: no drops, no status rewrites, no user data changes.

CREATE OR REPLACE FUNCTION public.vault_payment_locked(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT uid IS NOT NULL
    AND NOT public.vault_access_for_user(uid)
    AND (
      EXISTS (SELECT 1 FROM public.students s
        JOIN public.student_access sa ON sa.user_id = s.id
        WHERE s.auth_user_id = uid
          AND sa.status = 'past_due'
          AND sa.product_key IN ('vault_os','vault_academy')
          AND sa.stripe_subscription_id IS NOT NULL
          AND coalesce(sa.is_lifetime, false) = false)
      OR EXISTS (SELECT 1 FROM public.vault_return_memberships m
        WHERE m.auth_user_id = uid
          AND m.paid_at IS NOT NULL
          AND m.claimed_at IS NOT NULL
          AND m.status = 'past_due')
    );
$$;

REVOKE ALL ON FUNCTION public.vault_payment_locked(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vault_payment_locked(uuid) TO service_role;

-- Free areas also exclude payment-locked accounts. Every free-area RLS
-- boundary (community rooms, basic lesson, room locks, calendar,
-- notifications) already routes through this function.
CREATE OR REPLACE FUNCTION public.can_use_free_community()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid()
    AND coalesce(p.is_banned, false) = false
    AND coalesce(p.access_status, '') NOT IN ('banned','revoked'))
    AND NOT public.vault_payment_locked(auth.uid());
$$;

-- Caller-only lock state for the app shell.
CREATE OR REPLACE FUNCTION public.get_my_payment_lock()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(public.vault_payment_locked(auth.uid()), false);
$$;

REVOKE ALL ON FUNCTION public.get_my_payment_lock() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_payment_lock() TO authenticated, service_role;

-- Durable, deduplicated payment-recovery notice queue: one row per failed
-- invoice, separate from the welcome outbox.
CREATE TABLE IF NOT EXISTS public.vault_payment_recovery_outbox (
  stripe_invoice_id text PRIMARY KEY,
  stripe_subscription_id text NOT NULL,
  auth_user_id uuid,
  email text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.vault_payment_recovery_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.vault_payment_recovery_outbox TO service_role;
ALTER TABLE public.vault_payment_recovery_outbox ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS vault_payment_recovery_outbox_due
  ON public.vault_payment_recovery_outbox (next_attempt_at)
  WHERE state <> 'sent';

CREATE OR REPLACE FUNCTION public.claim_vault_payment_recovery_jobs()
RETURNS SETOF public.vault_payment_recovery_outbox
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.vault_payment_recovery_outbox o
     SET state = 'processing', attempts = o.attempts + 1,
         locked_until = now() + interval '5 minutes'
   WHERE o.stripe_invoice_id IN (
     SELECT stripe_invoice_id FROM public.vault_payment_recovery_outbox
      WHERE state <> 'sent' AND next_attempt_at <= now()
        AND (locked_until IS NULL OR locked_until < now())
      ORDER BY next_attempt_at
      LIMIT 25
      FOR UPDATE SKIP LOCKED)
  RETURNING o.*;
$$;

REVOKE ALL ON FUNCTION public.claim_vault_payment_recovery_jobs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vault_payment_recovery_jobs() TO service_role;
