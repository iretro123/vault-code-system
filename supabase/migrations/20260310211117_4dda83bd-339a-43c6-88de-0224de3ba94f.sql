
-- Create academy_room_reads table for DB-backed unread tracking
CREATE TABLE IF NOT EXISTS public.academy_room_reads (
  user_id uuid NOT NULL,
  room_slug text NOT NULL,
  last_read_seq bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_slug)
);

-- RLS
ALTER TABLE public.academy_room_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own room reads"
  ON public.academy_room_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own room reads"
  ON public.academy_room_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own room reads"
  ON public.academy_room_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for cross-tab sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.academy_room_reads;

-- Add sounds_enabled to user_preferences
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS sounds_enabled boolean NOT NULL DEFAULT true;
