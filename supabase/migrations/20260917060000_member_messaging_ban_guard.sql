-- A profile ban overrides every membership/staff role for member contact.
CREATE OR REPLACE FUNCTION public.member_messaging_eligible(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.profiles p
  JOIN public.user_roles r ON r.user_id=p.user_id
  JOIN auth.users u ON u.id=p.user_id
  WHERE p.user_id=uid AND coalesce(p.access_status,'') <> 'banned'
  AND (r.subscription_status='active' OR r.role::text IN ('free','operator','vault_os_owner'))
  AND lower(coalesce(u.email,'')) <> 'guest@vaulttradingacademy.com'
  AND coalesce(u.raw_user_meta_data->>'is_shared_guest','false') <> 'true'
  AND (r.subscription_expires_at IS NULL OR r.subscription_expires_at>now() OR r.role::text IN ('operator','vault_os_owner'))
 );
$$;
