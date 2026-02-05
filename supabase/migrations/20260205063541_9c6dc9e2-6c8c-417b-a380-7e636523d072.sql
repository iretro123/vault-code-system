-- Create vault_events table for tracking all vault-related events
CREATE TABLE public.vault_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_vault_events_user_id ON public.vault_events(user_id);
CREATE INDEX idx_vault_events_event_type ON public.vault_events(event_type);
CREATE INDEX idx_vault_events_created_at ON public.vault_events(created_at);

-- Enable Row Level Security
ALTER TABLE public.vault_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own events
CREATE POLICY "Users can view their own vault events"
  ON public.vault_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vault events"
  ON public.vault_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add documentation
COMMENT ON TABLE public.vault_events IS 'Audit log for all vault-related events including trades, rule changes, and discipline updates';