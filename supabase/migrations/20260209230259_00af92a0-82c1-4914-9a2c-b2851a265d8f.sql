
-- Rewrite daily_vault_reset with:
-- 1. Survival mode support
-- 2. Open trade flagging (don't clear if trade exists, flag attention)
-- 3. Session defaults to paused on new day
-- 4. Canonical math with all constants
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
  v_max_trades INTEGER;
  v_effective_mode TEXT;
BEGIN
  FOR r IN SELECT user_id, account_balance, risk_mode, open_trade FROM vault_state
  LOOP
    v_effective_mode := r.risk_mode;

    -- Viability check: CONSERVATIVE may not be viable
    IF v_effective_mode = 'CONSERVATIVE' THEN
      IF r.account_balance > 0 AND (r.account_balance * 0.01 / 2) < 20 THEN
        v_effective_mode := 'STANDARD';
      END IF;
    END IF;

    v_daily_percent := CASE v_effective_mode
      WHEN 'CONSERVATIVE' THEN 0.01
      WHEN 'AGGRESSIVE' THEN 0.03
      ELSE 0.02
    END;

    IF r.account_balance > 0 THEN
      v_raw_daily_risk := r.account_balance * v_daily_percent;
      v_raw_risk_per_trade := v_raw_daily_risk / 2;

      -- Survival mode
      IF v_raw_risk_per_trade < 20 THEN
        v_risk_per_trade := 20;
        v_daily_loss_limit := 20;
        v_max_contracts := 1;
        v_max_trades := 1;
      ELSE
        v_risk_per_trade := LEAST(GREATEST(GREATEST(v_raw_risk_per_trade, 30), 20), 50);
        v_daily_loss_limit := v_risk_per_trade * 2;
        v_max_contracts := GREATEST(1, FLOOR(v_risk_per_trade / 30))::INTEGER;
        v_max_trades := 2;
      END IF;
    ELSE
      v_daily_loss_limit := 0;
      v_max_contracts := 0;
      v_max_trades := 2;
    END IF;

    UPDATE vault_state SET
      risk_remaining_today = v_daily_loss_limit,
      trades_remaining_today = v_max_trades,
      loss_streak = 0,
      vault_status = CASE
        WHEN r.open_trade THEN 'YELLOW'  -- flag attention: stale open trade
        WHEN r.account_balance > 0 THEN 'GREEN'
        ELSE 'RED'
      END,
      -- Only clear open_trade if none exists; if one exists, keep it flagged
      open_trade = r.open_trade,
      last_block_reason = CASE
        WHEN r.open_trade THEN 'Open trade carried over from previous day'
        ELSE NULL
      END,
      daily_loss_limit = v_daily_loss_limit,
      max_trades_per_day = v_max_trades,
      max_contracts_allowed = v_max_contracts,
      risk_mode = v_effective_mode,
      session_paused = true,  -- New day starts paused
      date = CURRENT_DATE,
      updated_at = now()
    WHERE user_id = r.user_id;
  END LOOP;
END;
$$;
