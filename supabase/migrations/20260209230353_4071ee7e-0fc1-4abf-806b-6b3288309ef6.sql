
-- Daily Memory: one row per user per day, snapshot of trading day
CREATE TABLE IF NOT EXISTS public.daily_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_balance NUMERIC NOT NULL DEFAULT 0,
  risk_mode TEXT NOT NULL DEFAULT 'STANDARD',
  trades_taken INTEGER NOT NULL DEFAULT 0,
  trades_blocked INTEGER NOT NULL DEFAULT 0,
  risk_used NUMERIC NOT NULL DEFAULT 0,
  final_vault_status TEXT NOT NULL DEFAULT 'GREEN',
  session_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily memory"
  ON public.daily_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily memory"
  ON public.daily_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Behavior Stats: rolling aggregates per user, updated nightly
CREATE TABLE IF NOT EXISTS public.behavior_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  avg_trades_per_day NUMERIC NOT NULL DEFAULT 0,
  block_rate NUMERIC NOT NULL DEFAULT 0,
  red_day_rate NUMERIC NOT NULL DEFAULT 0,
  most_common_block TEXT,
  total_days_tracked INTEGER NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  total_blocks INTEGER NOT NULL DEFAULT 0,
  total_red_days INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.behavior_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own behavior stats"
  ON public.behavior_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Nightly aggregation function: snapshots daily_memory then updates behavior_stats
CREATE OR REPLACE FUNCTION public.nightly_memory_aggregation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  _trades_taken INTEGER;
  _trades_blocked INTEGER;
  _risk_used NUMERIC;
  _today DATE := CURRENT_DATE;
BEGIN
  -- Step 1: Write daily_memory for each user from today's vault_state
  FOR r IN
    SELECT
      vs.user_id,
      vs.account_balance,
      vs.risk_mode,
      vs.max_trades_per_day,
      vs.trades_remaining_today,
      vs.daily_loss_limit,
      vs.risk_remaining_today,
      vs.vault_status,
      vs.session_paused
    FROM vault_state vs
    WHERE vs.date = _today
  LOOP
    _trades_taken := r.max_trades_per_day - r.trades_remaining_today;
    _risk_used := GREATEST(0, r.daily_loss_limit - r.risk_remaining_today);

    -- Count blocked intents for today
    SELECT COUNT(*) INTO _trades_blocked
      FROM trade_intents ti
      WHERE ti.user_id = r.user_id
        AND ti.status = 'BLOCKED'
        AND ti.created_at::date = _today;

    INSERT INTO daily_memory (
      user_id, date, account_balance, risk_mode,
      trades_taken, trades_blocked, risk_used,
      final_vault_status, session_paused
    ) VALUES (
      r.user_id, _today, r.account_balance, r.risk_mode,
      _trades_taken, _trades_blocked, _risk_used,
      r.vault_status, r.session_paused
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      account_balance = EXCLUDED.account_balance,
      risk_mode = EXCLUDED.risk_mode,
      trades_taken = EXCLUDED.trades_taken,
      trades_blocked = EXCLUDED.trades_blocked,
      risk_used = EXCLUDED.risk_used,
      final_vault_status = EXCLUDED.final_vault_status,
      session_paused = EXCLUDED.session_paused;
  END LOOP;

  -- Step 2: Update behavior_stats from all daily_memory rows
  FOR r IN
    SELECT
      dm.user_id,
      COUNT(*) AS total_days,
      SUM(dm.trades_taken) AS total_trades,
      SUM(dm.trades_blocked) AS total_blocks,
      SUM(CASE WHEN dm.final_vault_status = 'RED' THEN 1 ELSE 0 END) AS total_red,
      ROUND(AVG(dm.trades_taken)::NUMERIC, 2) AS avg_trades,
      CASE WHEN SUM(dm.trades_taken) + SUM(dm.trades_blocked) > 0
        THEN ROUND(SUM(dm.trades_blocked)::NUMERIC / (SUM(dm.trades_taken) + SUM(dm.trades_blocked))::NUMERIC, 4)
        ELSE 0
      END AS block_pct,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(SUM(CASE WHEN dm.final_vault_status = 'RED' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC, 4)
        ELSE 0
      END AS red_pct
    FROM daily_memory dm
    GROUP BY dm.user_id
  LOOP
    INSERT INTO behavior_stats (
      user_id, avg_trades_per_day, block_rate, red_day_rate,
      total_days_tracked, total_trades, total_blocks, total_red_days,
      most_common_block, updated_at
    ) VALUES (
      r.user_id, r.avg_trades, r.block_pct, r.red_pct,
      r.total_days, r.total_trades, r.total_blocks, r.total_red,
      (SELECT ti.block_reason
       FROM trade_intents ti
       WHERE ti.user_id = r.user_id AND ti.status = 'BLOCKED' AND ti.block_reason IS NOT NULL
       GROUP BY ti.block_reason
       ORDER BY COUNT(*) DESC LIMIT 1),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      avg_trades_per_day = EXCLUDED.avg_trades_per_day,
      block_rate = EXCLUDED.block_rate,
      red_day_rate = EXCLUDED.red_day_rate,
      total_days_tracked = EXCLUDED.total_days_tracked,
      total_trades = EXCLUDED.total_trades,
      total_blocks = EXCLUDED.total_blocks,
      total_red_days = EXCLUDED.total_red_days,
      most_common_block = EXCLUDED.most_common_block,
      updated_at = now();
  END LOOP;
END;
$$;
