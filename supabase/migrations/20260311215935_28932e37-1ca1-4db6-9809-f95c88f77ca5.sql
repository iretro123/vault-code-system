
-- Fix 1: update_discipline_on_trade — handle DELETE by using OLD.user_id
CREATE OR REPLACE FUNCTION update_discipline_on_trade()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_discipline_metrics(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM calculate_discipline_metrics(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix 2: reverse_trade_entry_from_vault_state — fix date comparison (date vs date, no ::text cast)
CREATE OR REPLACE FUNCTION reverse_trade_entry_from_vault_state()
RETURNS trigger AS $$
DECLARE
  v_max_trades integer;
  v_max_risk numeric;
  v_new_streak integer;
  v_new_status text;
BEGIN
  -- Only reverse for same-day trades
  IF OLD.trade_date <> CURRENT_DATE THEN
    RETURN OLD;
  END IF;

  -- Get user's trading rules for max values
  SELECT max_trades_per_day, max_daily_loss
  INTO v_max_trades, v_max_risk
  FROM trading_rules
  WHERE user_id = OLD.user_id
  LIMIT 1;

  -- Defaults if no rules found
  v_max_trades := COALESCE(v_max_trades, 3);
  v_max_risk := COALESCE(v_max_risk, 3.0);

  -- Recalculate loss streak from remaining today's trades
  SELECT COALESCE(
    (SELECT count(*) FROM (
      SELECT risk_reward FROM trade_entries
      WHERE user_id = OLD.user_id AND trade_date = CURRENT_DATE AND id <> OLD.id
      ORDER BY created_at DESC
    ) sub WHERE sub.risk_reward < 0),
  0) INTO v_new_streak;

  -- Determine new vault status
  SELECT CASE
    WHEN v_new_streak >= 2 THEN 'RED'
    WHEN v_new_streak = 1 THEN 'YELLOW'
    ELSE 'GREEN'
  END INTO v_new_status;

  -- Update vault_state: restore capacity and recalculate status
  UPDATE vault_state
  SET
    trades_remaining_today = LEAST(trades_remaining_today + 1, v_max_trades),
    risk_remaining_today = LEAST(risk_remaining_today + ABS(OLD.risk_used * OLD.risk_reward), 
      (SELECT account_balance FROM profiles WHERE user_id = OLD.user_id LIMIT 1) * v_max_risk / 100),
    loss_streak = v_new_streak,
    vault_status = v_new_status,
    last_block_reason = CASE WHEN v_new_status = 'GREEN' THEN NULL ELSE last_block_reason END,
    updated_at = now()
  WHERE user_id = OLD.user_id AND date = CURRENT_DATE;

  -- Revert linked approved_plan from 'logged' back to 'planned'
  IF OLD.plan_id IS NOT NULL THEN
    UPDATE approved_plans
    SET status = 'planned', updated_at = now()
    WHERE id = OLD.plan_id AND user_id = OLD.user_id AND status = 'logged';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
