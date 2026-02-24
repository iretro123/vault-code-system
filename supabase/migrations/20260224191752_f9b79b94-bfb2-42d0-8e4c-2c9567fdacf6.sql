
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS is_replay boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS replay_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid;
