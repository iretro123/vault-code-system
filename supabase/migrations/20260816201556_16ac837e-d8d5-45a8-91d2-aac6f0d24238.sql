WITH wl AS (
  SELECT DISTINCT p.user_id
  FROM public.profiles p
  JOIN public.allowed_signups a ON lower(a.email) = lower(p.email)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id
      AND ur.role IN ('vault_access','vault_intelligence','vault_os_owner','operator')
  )
)
INSERT INTO public.user_roles (user_id, role, subscription_status)
SELECT user_id, 'vault_access', 'active' FROM wl
ON CONFLICT (user_id, role) DO UPDATE SET subscription_status = 'active';

DELETE FROM public.user_roles ur
WHERE ur.role IN ('basic_tier','free')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.allowed_signups a ON lower(a.email) = lower(p.email)
    WHERE p.user_id = ur.user_id
  );

UPDATE public.profiles p
SET access_status = 'active', updated_at = now()
WHERE p.access_status <> 'banned'
  AND EXISTS (
    SELECT 1 FROM public.allowed_signups a WHERE lower(a.email) = lower(p.email)
  );