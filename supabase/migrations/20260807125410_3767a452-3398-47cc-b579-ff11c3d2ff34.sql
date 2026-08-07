-- 1. Audit column: why does this user have this access?
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS access_source text NOT NULL DEFAULT 'free';

COMMENT ON COLUMN public.user_roles.access_source IS
  'Why this role was granted: stripe | whop | apple | whitelist | manual | owner | free';

-- 2. Deny-by-default: new signups land on basic_tier, never the ungated legacy "free"
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'basic_tier'::app_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  -- Deny-by-default: everyone starts on Free Basic. Paid/whitelist grants are
  -- applied afterwards by sync-stripe-members / check-stripe-customer.
  INSERT INTO public.user_roles (user_id, role, subscription_status, access_source)
  VALUES (NEW.id, 'basic_tier', 'none', 'free');

  INSERT INTO public.trading_rules (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- 3. Tag the existing population with its real access source
UPDATE public.user_roles ur
SET access_source = 'owner'
WHERE ur.role IN ('vault_os_owner', 'operator');

UPDATE public.user_roles ur
SET access_source = 'whitelist'
WHERE ur.role = 'free'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.allowed_signups a ON lower(a.email) = lower(p.email)
    WHERE p.user_id = ur.user_id
  );

-- 4. Promote whitelisted manual grants to a real full-access role, so the
--    legacy "free" role stops meaning "unlimited access".
UPDATE public.user_roles ur
SET role = 'vault_access',
    subscription_status = 'active',
    updated_at = now()
WHERE ur.role = 'free'
  AND ur.access_source = 'whitelist';

-- 5. Any remaining legacy "free" rows are genuinely free users -> Free Basic
UPDATE public.user_roles ur
SET role = 'basic_tier',
    subscription_status = 'none',
    access_source = 'free',
    updated_at = now()
WHERE ur.role = 'free';

-- 6. Membership lookup must report Free Basic instead of returning nothing
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY
    CASE role
      WHEN 'operator' THEN 6
      WHEN 'vault_intelligence' THEN 5
      WHEN 'vault_access' THEN 4
      WHEN 'vault_os_owner' THEN 3
      WHEN 'basic_tier' THEN 2
      WHEN 'free' THEN 1
    END DESC
  LIMIT 1
$$;