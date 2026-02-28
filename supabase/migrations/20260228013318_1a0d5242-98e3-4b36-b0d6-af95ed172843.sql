
-- user_activity_logs: lightweight usage logging for dispute/churn support
CREATE TABLE public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_name text NOT NULL,
  page_key text,
  metadata_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by user
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs (user_id, created_at DESC);

-- Index for admin queries by event name
CREATE INDEX idx_user_activity_logs_event ON public.user_activity_logs (event_name, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert own rows
CREATE POLICY "Users can insert own activity logs"
  ON public.user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read own rows
CREATE POLICY "Users can read own activity logs"
  ON public.user_activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Operators can read all rows
CREATE POLICY "Operators can read all activity logs"
  ON public.user_activity_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'operator'::app_role));
