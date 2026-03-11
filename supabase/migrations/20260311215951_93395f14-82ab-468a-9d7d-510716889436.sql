
-- Set search_path on both functions to prevent search path injection
CREATE OR REPLACE FUNCTION public.update_discipline_on_trade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_discipline_metrics(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM calculate_discipline_metrics(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_trade_entry_from_vault_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_max_trades integer;
  v_max_risk numeric;
  v_new_streak integer;
  v_new_status text;
BEGIN
  IF OLD.trade_date <> CURRENT_DATE THEN
    RETURN OLD;
  END IF;

  SELECT max_trades_per_day, max_daily_loss
  INTO v_max_trades, v_max_risk
  FROM trading_rules
  WHERE user_id = OLD.user_id
  LIMIT 1;

  v_max_trades := COALESCE(v_max_trades, 3);
  v_max_risk := COALESCE(v_max_risk, 3.0);

  SELECT COALESCE(
    (SELECT count(*) FROM (
      SELECT risk_reward FROM trade_entries
      WHERE user_id = OLD.user_id AND trade_date = CURRENT_DATE AND id <> OLD.id
      ORDER BY created_at DESC
    ) sub WHERE sub.risk_reward < 0),
  0) INTO v_new_streak;

  SELECT CASE
    WHEN v_new_streak >= 2 THEN 'RED'
    WHEN v_new_streak = 1 THEN 'YELLOW'
    ELSE 'GREEN'
  END INTO v_new_status;

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

  IF OLD.plan_id IS NOT NULL THEN
    UPDATE approved_plans
    SET status = 'planned', updated_at = now()
    WHERE id = OLD.plan_id AND user_id = OLD.user_id AND status = 'logged';
  END IF;

  RETURN OLD;
END;
$$;
