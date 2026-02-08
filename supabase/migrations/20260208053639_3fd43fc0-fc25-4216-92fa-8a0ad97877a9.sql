
ALTER TABLE public.vault_state ADD COLUMN IF NOT EXISTS session_paused boolean NOT NULL DEFAULT false;
