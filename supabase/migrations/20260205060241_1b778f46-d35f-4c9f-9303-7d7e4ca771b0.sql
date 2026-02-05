-- Create the single authority function for trade permissions
CREATE OR REPLACE FUNCTION public.check_trade_permission(_user_id uuid)
RETURNS TABLE(
  can_trade boolean,
  reason text,
  discipline_score integer,
  discipline_status text,
  trades_remaining integer,
  daily_loss_remaining numeric,
  max_risk_per_trade numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules RECORD;
  v_metrics RECORD;
  v_today DATE := CURRENT_DATE;
  v_trades_today INTEGER := 0;
  v_daily_loss_used NUMERIC := 0;
  v_violations_today INTEGER := 0;
  v_discipline_score INTEGER := 0;
  v_discipline_status TEXT := 'locked';
  v_can_trade BOOLEAN := FALSE;
  v_reason TEXT := 'Unknown';
  v_trades_remaining INTEGER := 0;
  v_daily_loss_remaining NUMERIC := 0;
  v_max_risk_per_trade NUMERIC := 1.0;
BEGIN
  -- Get user's trading rules
  SELECT * INTO v_rules 
  FROM trading_rules 
  WHERE user_id = _user_id;
  
  IF v_rules IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Trading rules not configured'::text,
      0::integer,
      'locked'::text,
      0::integer,
      0::numeric,
      1.0::numeric;
    RETURN;
  END IF;
  
  -- Set max risk per trade from rules
  v_max_risk_per_trade := v_rules.max_risk_per_trade;
  
  -- Get discipline metrics from the existing function
  SELECT * INTO v_metrics
  FROM calculate_discipline_metrics(_user_id);
  
  IF v_metrics IS NOT NULL THEN
    v_discipline_score := COALESCE(v_metrics.discipline_score, 0);
    v_discipline_status := COALESCE(v_metrics.discipline_status, 'locked');
    v_trades_today := COALESCE(v_metrics.trades_today, 0);
    v_violations_today := COALESCE(v_metrics.violations_today, 0);
  END IF;
  
  -- Calculate daily loss used from today's trades
  SELECT COALESCE(SUM(risk_used), 0) INTO v_daily_loss_used
  FROM trade_entries 
  WHERE user_id = _user_id AND trade_date = v_today;
  
  -- Calculate remaining allowances
  v_trades_remaining := GREATEST(0, v_rules.max_trades_per_day - v_trades_today);
  v_daily_loss_remaining := GREATEST(0, v_rules.max_daily_loss - v_daily_loss_used);
  
  -- Strict permission logic - DENY if any condition fails
  -- Check conditions in priority order
  IF v_discipline_status = 'locked' THEN
    v_can_trade := FALSE;
    v_reason := 'Discipline status is locked';
  ELSIF v_discipline_score < 30 THEN
    v_can_trade := FALSE;
    v_reason := 'Discipline score below minimum threshold (30)';
  ELSIF v_violations_today > 0 THEN
    v_can_trade := FALSE;
    v_reason := 'Rule violation detected today';
  ELSIF v_trades_today >= v_rules.max_trades_per_day THEN
    v_can_trade := FALSE;
    v_reason := format('Maximum trades reached (%s/%s)', v_trades_today, v_rules.max_trades_per_day);
  ELSIF v_daily_loss_used >= v_rules.max_daily_loss THEN
    v_can_trade := FALSE;
    v_reason := format('Daily loss limit reached (%.1f%%/%.1f%%)', v_daily_loss_used, v_rules.max_daily_loss);
  ELSE
    -- ALL conditions passed - ALLOW trading
    v_can_trade := TRUE;
    v_reason := 'All discipline checks passed';
  END IF;
  
  RETURN QUERY SELECT 
    v_can_trade,
    v_reason,
    v_discipline_score,
    v_discipline_status,
    v_trades_remaining,
    v_daily_loss_remaining,
    v_max_risk_per_trade;
END;
$$;