
CREATE TABLE public.allowed_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  stripe_customer_id text,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed boolean NOT NULL DEFAULT false,
  CONSTRAINT allowed_signups_email_unique UNIQUE (email)
);

ALTER TABLE public.allowed_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can manage allowed signups"
  ON public.allowed_signups FOR ALL
  USING (has_role(auth.uid(), 'operator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operator'::app_role));

-- Allow the edge function (anon key, no auth) to read for signup verification
CREATE POLICY "Anon can read unclaimed allowed signups"
  ON public.allowed_signups FOR SELECT
  TO anon
  USING (claimed = false);
