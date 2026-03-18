
CREATE TABLE public.agreement_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  agreement_version text NOT NULL,
  ip_address text
);

ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own agreement acceptances"
  ON public.agreement_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own agreement acceptances"
  ON public.agreement_acceptances
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
