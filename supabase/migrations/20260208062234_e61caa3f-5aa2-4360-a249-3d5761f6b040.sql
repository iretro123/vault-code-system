
-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Daily vault reset function: resets counters, recomputes limits from canonical math
CREATE OR REPLACE FUNCTION public.daily_vault_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_daily_percent NUMERIC;
  v_raw_daily_risk NUMERIC;
  v_raw_risk_per_trade NUMERIC;
  v_risk_per_trade NUMERIC;
  v_daily_loss_limit NUMERIC;
  v_max_contracts INTEGER;
  v_max_trades INTEGER := 2;  -- MAX_LOSSES_PER_DAY
  v_min_viable INTEGER := 20;
  v_target INTEGER := 30;
  v_max_contract INTEGER := 50;
BEGIN
  FOR r IN SELECT user_id, account_balance, risk_mode FROM vault_state
  LOOP
    -- Resolve daily percent from risk mode
    v_daily_percent := CASE r.risk_mode
      WHEN 'CONSERVATIVE' THEN 0.01
      WHEN 'STANDARD' THEN 0.02
      WHEN 'AGGRESSIVE' THEN 0.03
      ELSE 0.02
    END;

    -- Canonical computeVaultLimits math
    v_raw_daily_risk := r.account_balance * v_daily_percent;
    v_raw_risk_per_trade := v_raw_daily_risk / v_max_trades;
    v_risk_per_trade := LEAST(GREATEST(GREATEST(v_raw_risk_per_trade, v_target), v_min_viable), v_max_contract);
    v_daily_loss_limit := v_risk_per_trade * v_max_trades;
    v_max_contracts := GREATEST(1, FLOOR(v_risk_per_trade / v_target));

    UPDATE vault_state SET
      -- Reset daily counters
      risk_remaining_today = v_daily_loss_limit,
      trades_remaining_today = v_max_trades,
      loss_streak = 0,
      vault_status = 'GREEN',
      open_trade = false,
      last_block_reason = NULL,
      -- Recompute limits (balance & risk_mode preserved)
      daily_loss_limit = v_daily_loss_limit,
      max_trades_per_day = v_max_trades,
      max_contracts_allowed = v_max_contracts,
      date = CURRENT_DATE,
      updated_at = now()
    WHERE user_id = r.user_id;
  END LOOP;
END;
$$;
