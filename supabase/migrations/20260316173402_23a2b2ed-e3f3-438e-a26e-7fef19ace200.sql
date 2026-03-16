
-- Add preferred_alert_channel to user_preferences
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS preferred_alert_channel text NOT NULL DEFAULT 'in_app';

-- Create balance_adjustments table
CREATE TABLE public.balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  adjustment_date date NOT NULL DEFAULT CURRENT_DATE,
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS: users can CRUD their own rows
CREATE POLICY "Users can read own adjustments"
  ON public.balance_adjustments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adjustments"
  ON public.balance_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own adjustments"
  ON public.balance_adjustments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own adjustments"
  ON public.balance_adjustments FOR DELETE
  USING (auth.uid() = user_id);
