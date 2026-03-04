
-- Feature flags table
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only operators can update
CREATE POLICY "Operators can update feature flags"
  ON public.feature_flags FOR UPDATE
  USING (has_role(auth.uid(), 'operator'::app_role));

-- Seed toggleable pages
INSERT INTO public.feature_flags (page_key, label, enabled) VALUES
  ('dashboard', 'Dashboard', true),
  ('learn', 'Learn', true),
  ('trade', 'Trade', true),
  ('community', 'Community', true),
  ('live', 'Live', true),
  ('resources', 'Trading Toolkit', true);
