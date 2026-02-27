-- Students table (maps to Stripe customers / Vault users)
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  phone text,
  stripe_customer_id text,
  auth_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT students_email_unique UNIQUE (email),
  CONSTRAINT students_stripe_customer_unique UNIQUE (stripe_customer_id)
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own student record"
  ON public.students FOR SELECT
  USING (auth.uid() = auth_user_id OR has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Service role manages students"
  ON public.students FOR ALL
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'operator'::app_role))
  WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'operator'::app_role));

-- Student access table (source of truth for access tiers)
CREATE TABLE IF NOT EXISTS public.student_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  product_key text NOT NULL DEFAULT 'vault_academy',
  tier text NOT NULL DEFAULT 'elite_v1',
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  stripe_price_id text,
  access_granted_at timestamptz NOT NULL DEFAULT now(),
  access_ended_at timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_access_user_product UNIQUE (user_id, product_key)
);

ALTER TABLE public.student_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own access"
  ON public.student_access FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid())
    OR has_role(auth.uid(), 'operator'::app_role)
  );

CREATE POLICY "Service role manages access"
  ON public.student_access FOR ALL
  USING (has_role(auth.uid(), 'operator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operator'::app_role));

-- Stripe webhook events (audit + dedupe log)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  checkout_session_id text,
  amount integer,
  currency text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  trace_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT stripe_webhook_events_stripe_event_unique UNIQUE (stripe_event_id)
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can read webhook events"
  ON public.stripe_webhook_events FOR SELECT
  USING (has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can manage webhook events"
  ON public.stripe_webhook_events FOR ALL
  USING (has_role(auth.uid(), 'operator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operator'::app_role));