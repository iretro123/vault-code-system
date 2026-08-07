WITH wl AS (
  SELECT p.user_id
  FROM public.allowed_signups a
  JOIN public.profiles p ON lower(p.email) = lower(a.email)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = p.user_id
      AND r.role IN ('vault_access','vault_intelligence','vault_os_owner','operator')
  )
)
INSERT INTO public.user_roles (user_id, role, access_source, subscription_status)
SELECT user_id, 'vault_access', 'whitelist', 'active' FROM wl
ON CONFLICT (user_id, role) DO UPDATE
  SET access_source = 'whitelist', subscription_status = 'active', updated_at = now();

DELETE FROM public.user_roles r
USING public.allowed_signups a, public.profiles p
WHERE lower(p.email) = lower(a.email)
  AND r.user_id = p.user_id
  AND r.role IN ('basic_tier','free');

UPDATE public.profiles p
SET access_status = 'active', updated_at = now()
FROM public.allowed_signups a
WHERE lower(p.email) = lower(a.email)
  AND p.access_status <> 'banned';