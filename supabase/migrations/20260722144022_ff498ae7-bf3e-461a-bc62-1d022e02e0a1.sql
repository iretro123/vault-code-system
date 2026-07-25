
-- Restore Plummer283@gmail.com to full access after successful Apple purchase
-- that never reached our backend (StoreKit transaction was finished before
-- activation, so it fell on the floor). We can safely grant the role because
-- Apple confirmed the active $99/mo subscription.
DELETE FROM public.user_roles
 WHERE user_id = '07616a1a-6f98-418a-b82f-4cda736af9c7'
   AND role IN ('basic_tier','free');

INSERT INTO public.user_roles (user_id, role, subscription_status, subscription_started_at, subscription_expires_at)
VALUES (
  '07616a1a-6f98-418a-b82f-4cda736af9c7',
  'vault_access',
  'active',
  now(),
  now() + interval '35 days'
)
ON CONFLICT (user_id, role) DO UPDATE
  SET subscription_status = 'active',
      subscription_started_at = COALESCE(public.user_roles.subscription_started_at, EXCLUDED.subscription_started_at),
      subscription_expires_at = EXCLUDED.subscription_expires_at,
      updated_at = now();

UPDATE public.profiles
   SET access_status = 'active', updated_at = now()
 WHERE user_id = '07616a1a-6f98-418a-b82f-4cda736af9c7';
