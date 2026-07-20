
ALTER TABLE public.student_access ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_my_access_state()
RETURNS TABLE (
  student_id uuid,
  product_key text,
  tier text,
  status text,
  stripe_customer_id text,
  updated_at timestamptz,
  has_access boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id AS student_id,
    sa.product_key,
    sa.tier,
    sa.status,
    s.stripe_customer_id,
    sa.updated_at,
    (sa.status IN ('active', 'trialing') OR sa.is_lifetime = true) AS has_access
  FROM students s
  JOIN student_access sa ON sa.user_id = s.id
  WHERE s.auth_user_id = auth.uid()
  ORDER BY sa.updated_at DESC
  LIMIT 1
$$;
