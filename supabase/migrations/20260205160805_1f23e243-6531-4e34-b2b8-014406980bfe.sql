-- Add vault verification tracking columns to trade_entries
ALTER TABLE public.trade_entries
ADD COLUMN IF NOT EXISTS vault_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.trade_entries
ADD COLUMN IF NOT EXISTS vault_verified_at timestamptz;

-- Index for efficient querying of verified trades
CREATE INDEX IF NOT EXISTS trade_entries_user_verified_idx
  ON public.trade_entries(user_id, vault_verified, created_at DESC);