
-- Create inbox_dismissals table for persistent per-user dismiss tracking
CREATE TABLE public.inbox_dismissals (
  user_id uuid NOT NULL,
  inbox_item_id uuid NOT NULL REFERENCES public.inbox_items(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, inbox_item_id)
);

-- Enable RLS
ALTER TABLE public.inbox_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can insert their own dismissals
CREATE POLICY "Users can insert own dismissals"
  ON public.inbox_dismissals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own dismissals
CREATE POLICY "Users can read own dismissals"
  ON public.inbox_dismissals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own dismissals (for undo if needed)
CREATE POLICY "Users can delete own dismissals"
  ON public.inbox_dismissals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
