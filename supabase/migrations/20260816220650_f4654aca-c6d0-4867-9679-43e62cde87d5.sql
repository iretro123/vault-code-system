-- Grant full access to a whitelisted email (idempotent, never touches staff or paid sources)
CREATE OR REPLACE FUNCTION public.grant_whitelist_access(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF _email IS NULL THEN RETURN; END IF;

  SELECT id INTO _uid FROM auth.users
  WHERE lower(email) = lower(btrim(_email))
  ORDER BY created_at LIMIT 1;

  IF _uid IS NULL THEN RETURN; END IF;

  -- never modify staff/owner accounts
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role IN ('vault_os_owner','operator')
  ) THEN RETURN; END IF;

  -- already has full access: leave source alone
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role = 'vault_access'
  ) THEN
    INSERT INTO public.user_roles (user_id, role, subscription_status, access_source)
    VALUES (_uid, 'vault_access', 'active', 'whitelist')
    ON CONFLICT DO NOTHING;
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _uid AND role IN ('basic_tier','free');

  UPDATE public.profiles
  SET access_status = 'active', updated_at = now()
  WHERE user_id = _uid AND access_status <> 'active';
END;
$$;

-- Revoke access that came only from the whitelist
CREATE OR REPLACE FUNCTION public.revoke_whitelist_access(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF _email IS NULL THEN RETURN; END IF;

  SELECT id INTO _uid FROM auth.users
  WHERE lower(email) = lower(btrim(_email))
  ORDER BY created_at LIMIT 1;

  IF _uid IS NULL THEN RETURN; END IF;

  -- still whitelisted under another row? keep access
  IF EXISTS (
    SELECT 1 FROM public.allowed_signups
    WHERE lower(btrim(email)) = lower(btrim(_email))
  ) THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role IN ('vault_os_owner','operator')
  ) THEN RETURN; END IF;

  -- only remove access that was created by whitelisting
  DELETE FROM public.user_roles
  WHERE user_id = _uid
    AND role = 'vault_access'
    AND coalesce(access_source, '') = 'whitelist';

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role IN ('vault_access','vault_os_owner','vault_intelligence','operator','free')
  ) THEN
    INSERT INTO public.user_roles (user_id, role, subscription_status, access_source)
    VALUES (_uid, 'basic_tier', 'active', 'downgrade')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Triggers on the whitelist table
CREATE OR REPLACE FUNCTION public.tg_allowed_signups_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.grant_whitelist_access(NEW.email);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF lower(btrim(coalesce(OLD.email,''))) <> lower(btrim(coalesce(NEW.email,''))) THEN
      PERFORM public.revoke_whitelist_access(OLD.email);
      PERFORM public.grant_whitelist_access(NEW.email);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.revoke_whitelist_access(OLD.email);
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS allowed_signups_access_sync ON public.allowed_signups;
CREATE TRIGGER allowed_signups_access_sync
AFTER INSERT OR UPDATE OR DELETE ON public.allowed_signups
FOR EACH ROW EXECUTE FUNCTION public.tg_allowed_signups_access();

-- New signups: if their email is whitelisted, grant full access right away
CREATE OR REPLACE FUNCTION public.tg_profile_whitelist_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  IF _email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.allowed_signups
    WHERE lower(btrim(email)) = lower(btrim(_email))
  ) THEN
    PERFORM public.grant_whitelist_access(_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_whitelist_access_sync ON public.profiles;
CREATE TRIGGER profiles_whitelist_access_sync
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_profile_whitelist_access();

-- Repair function: upgrade any whitelisted member stuck on Free Basic
CREATE OR REPLACE FUNCTION public.repair_whitelist_access()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
  _count integer := 0;
BEGIN
  FOR _row IN
    SELECT DISTINCT lower(btrim(email)) AS email FROM public.allowed_signups
  LOOP
    PERFORM public.grant_whitelist_access(_row.email);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

SELECT public.repair_whitelist_access();