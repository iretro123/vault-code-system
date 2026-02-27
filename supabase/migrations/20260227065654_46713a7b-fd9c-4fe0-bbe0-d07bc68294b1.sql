-- One-time bootstrap: promote test@vault.dev to operator app_role
UPDATE public.user_roles 
SET role = 'operator', updated_at = now() 
WHERE user_id = '6f863212-a859-4812-9775-0b1388bc21b3';

-- Create a reusable admin promotion function (CEO-only, security definer)
CREATE OR REPLACE FUNCTION public.promote_to_ceo(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ceo_role_id uuid;
BEGIN
  -- Only existing CEO can call this
  IF NOT is_academy_ceo(auth.uid()) THEN
    RAISE EXCEPTION 'Only CEO can promote users';
  END IF;
  
  SELECT id INTO ceo_role_id FROM academy_roles WHERE name = 'CEO';
  
  -- Upsert academy role
  INSERT INTO academy_user_roles (user_id, role_id, assigned_by)
  VALUES (target_user_id, ceo_role_id, auth.uid())
  ON CONFLICT (user_id, role_id) DO UPDATE SET assigned_by = auth.uid(), assigned_at = now();
  
  -- Upsert operator app_role
  UPDATE user_roles SET role = 'operator', updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;