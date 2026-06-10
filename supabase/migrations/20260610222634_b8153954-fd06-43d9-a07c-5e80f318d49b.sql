CREATE TABLE public.ios_membership_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  original_transaction_id TEXT NOT NULL,
  purchase_date TIMESTAMPTZ,
  expires_date TIMESTAMPTZ,
  environment TEXT,
  ownership_type TEXT,
  app_account_token UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ios_membership_activations TO authenticated;
GRANT ALL ON public.ios_membership_activations TO service_role;

CREATE INDEX idx_ios_membership_activations_user_id
  ON public.ios_membership_activations(user_id, created_at DESC);

CREATE TRIGGER update_ios_membership_activations_updated_at
  BEFORE UPDATE ON public.ios_membership_activations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ios_membership_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ios membership activations"
  ON public.ios_membership_activations
  FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'operator'::app_role));