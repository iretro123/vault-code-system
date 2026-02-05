-- Create the unified Vault Status authority function
-- This is the single source of truth for all Vault OS decisions
CREATE OR REPLACE FUNCTION public.get_vault_status(_user_id uuid)
RETURNS TABLE(
  can_trade boolean,
  reason text,
  discipline_score integer,
  discipline_status text,
  discipline_rank text,
  trades_today integer,
  trades_remaining integer,
  max_trades_per_day integer,
  daily_loss_used numeric,
  daily_loss_remaining numeric,
  max_daily_loss numeric,
  max_risk_per_trade numeric,
  streak_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permission RECORD;
  v_metrics RECORD;
  v_rules RECORD;
  v_today DATE := CURRENT_DATE;
  v_daily_loss_used NUMERIC := 0;
  v_discipline_rank TEXT := 'Undisciplined';
BEGIN
  -- Get trading rules
  SELECT * INTO v_rules 
  FROM trading_rules 
  WHERE user_id = _user_id;
  
  IF v_rules IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Trading rules not configured'::text,
      0::integer,
      'locked'::text,
      'Undisciplined'::text,
      0::integer,
      0::integer,
      3::integer,
      0::numeric,
      0::numeric,
      3::numeric,
      1::numeric,
      0::integer;
    RETURN;
  END IF;
  
  -- Get trade permission from authority function
  SELECT * INTO v_permission
  FROM check_trade_permission(_user_id);
  
  -- Get discipline metrics
  SELECT * INTO v_metrics
  FROM calculate_discipline_metrics(_user_id);
  
  -- Calculate daily loss used from today's trades
  SELECT COALESCE(SUM(risk_used), 0) INTO v_daily_loss_used
  FROM trade_entries 
  WHERE user_id = _user_id AND trade_date = v_today;
  
  -- Calculate discipline rank based on score
  IF v_permission.discipline_score >= 80 THEN
    v_discipline_rank := 'Elite';
  ELSIF v_permission.discipline_score >= 60 THEN
    v_discipline_rank := 'Consistent';
  ELSIF v_permission.discipline_score >= 40 THEN
    v_discipline_rank := 'Developing';
  ELSE
    v_discipline_rank := 'Undisciplined';
  END IF;
  
  -- Return complete vault status
  RETURN QUERY SELECT 
    v_permission.can_trade,
    v_permission.reason,
    v_permission.discipline_score,
    v_permission.discipline_status,
    v_discipline_rank,
    COALESCE(v_metrics.trades_today, 0)::integer,
    v_permission.trades_remaining,
    v_rules.max_trades_per_day::integer,
    v_daily_loss_used,
    v_permission.daily_loss_remaining,
    v_rules.max_daily_loss,
    v_rules.max_risk_per_trade,
    COALESCE(v_metrics.streak_days, 0)::integer;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_vault_status(_user_id uuid) IS 
'Central authority function for Vault OS. Returns complete trading status including permissions, discipline metrics, and rule limits. All frontend decisions must originate from this function.';