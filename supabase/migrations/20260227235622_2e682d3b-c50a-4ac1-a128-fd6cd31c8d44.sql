
-- RLS policies for students + student_access self-read
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own student row"
  ON public.students FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can read own student access"
  ON public.student_access FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid()));

-- RPC: get_my_access_state
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
    (sa.status IN ('active', 'trialing')) AS has_access
  FROM students s
  JOIN student_access sa ON sa.user_id = s.id
  WHERE s.auth_user_id = auth.uid()
  ORDER BY sa.updated_at DESC
  LIMIT 1
$$;
