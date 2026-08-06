CREATE TABLE IF NOT EXISTS public.android_membership_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  purchase_token TEXT NOT NULL UNIQUE,
  order_id TEXT,
  package_name TEXT NOT NULL,
  purchase_date TIMESTAMPTZ,
  expires_date TIMESTAMPTZ,
  acknowledgement_state TEXT,
  subscription_state TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_android_membership_activations_user_id
  ON public.android_membership_activations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_android_membership_activations_order_id
  ON public.android_membership_activations(order_id)
  WHERE order_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_android_membership_activations_updated_at
  ON public.android_membership_activations;

CREATE TRIGGER update_android_membership_activations_updated_at
  BEFORE UPDATE ON public.android_membership_activations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.android_membership_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own android membership activations"
  ON public.android_membership_activations;

CREATE POLICY "Users can view their own android membership activations"
  ON public.android_membership_activations
  FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'operator'::app_role));
