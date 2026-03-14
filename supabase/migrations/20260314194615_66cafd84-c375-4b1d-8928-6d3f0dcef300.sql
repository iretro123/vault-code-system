
-- 1. Add structured columns to trade_entries (all nullable, additive only)
ALTER TABLE public.trade_entries ADD COLUMN IF NOT EXISTS contracts integer;
ALTER TABLE public.trade_entries ADD COLUMN IF NOT EXISTS actual_pnl numeric;
ALTER TABLE public.trade_entries ADD COLUMN IF NOT EXISTS planned_risk_dollars numeric;
ALTER TABLE public.trade_entries ADD COLUMN IF NOT EXISTS entry_price numeric;
ALTER TABLE public.trade_entries ADD COLUMN IF NOT EXISTS exit_price numeric;
ALTER TABLE public.trade_entries ADD COLUMN IF NOT EXISTS is_oversized boolean NOT NULL DEFAULT false;

-- 2. Create trading_sessions table
CREATE TABLE public.trading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_date date NOT NULL,
  start_time time NOT NULL,
  cutoff_time time NOT NULL,
  hard_close_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_date)
);

-- 3. RLS for trading_sessions
ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trading sessions"
  ON public.trading_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
