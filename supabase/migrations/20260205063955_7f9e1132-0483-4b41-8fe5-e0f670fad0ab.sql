-- Update check_trade_permission to log blocked trades
CREATE OR REPLACE FUNCTION public.check_trade_permission(_user_id uuid)
RETURNS TABLE(can_trade boolean, reason text, discipline_score integer, discipline_status text, trades_remaining integer, daily_loss_remaining numeric, max_risk_per_trade numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    v_can_trade := TRUE;
    v_reason := 'All discipline checks passed';
  END IF;
  
  -- LOG EVENT: When trade is blocked
  IF v_can_trade = FALSE THEN
    PERFORM log_vault_event(
      _user_id,
      'trade_blocked',
      jsonb_build_object(
        'reason', v_reason,
        'discipline_score', v_discipline_score,
        'timestamp', now()
      )
    );
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
$function$;

-- Update get_adaptive_risk_limit to log risk level changes
CREATE OR REPLACE FUNCTION public.get_adaptive_risk_limit(_user_id uuid)
RETURNS TABLE(
  adaptive_risk_limit numeric,
  risk_level text,
  adjustment_factor numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status RECORD;
  v_adaptive_limit NUMERIC := 0;
  v_risk_level TEXT := 'LOCKED';
  v_adjustment NUMERIC := 0;
  v_last_risk_level TEXT := NULL;
BEGIN
  -- Get vault status from authority function
  SELECT * INTO v_status
  FROM get_vault_status(_user_id);

  IF v_status IS NULL THEN
    RETURN QUERY SELECT
      0::numeric,
      'LOCKED'::text,
      0::numeric;
    RETURN;
  END IF;

  -- Apply adaptive risk logic based on discipline status and score
  IF v_status.discipline_status = 'locked' THEN
    v_adaptive_limit := 0;
    v_risk_level := 'LOCKED';
    v_adjustment := 0;
  ELSIF v_status.discipline_score >= 80 THEN
    v_adaptive_limit := v_status.max_risk_per_trade;
    v_risk_level := 'FULL';
    v_adjustment := 1.0;
  ELSIF v_status.discipline_score >= 60 THEN
    v_adaptive_limit := v_status.max_risk_per_trade * 0.75;
    v_risk_level := 'REDUCED';
    v_adjustment := 0.75;
  ELSIF v_status.discipline_score >= 40 THEN
    v_adaptive_limit := v_status.max_risk_per_trade * 0.50;
    v_risk_level := 'RESTRICTED';
    v_adjustment := 0.50;
  ELSE
    v_adaptive_limit := v_status.max_risk_per_trade * 0.25;
    v_risk_level := 'MINIMAL';
    v_adjustment := 0.25;
  END IF;

  -- Get last recorded risk level for comparison
  SELECT event_context->>'risk_level' INTO v_last_risk_level
  FROM vault_events
  WHERE user_id = _user_id 
    AND event_type = 'risk_level_changed'
  ORDER BY created_at DESC
  LIMIT 1;

  -- LOG EVENT: When risk level changes
  IF v_last_risk_level IS NULL OR v_last_risk_level != v_risk_level THEN
    PERFORM log_vault_event(
      _user_id,
      'risk_level_changed',
      jsonb_build_object(
        'risk_level', v_risk_level,
        'adjustment_factor', v_adjustment,
        'discipline_score', v_status.discipline_score,
        'previous_level', COALESCE(v_last_risk_level, 'NONE')
      )
    );
  END IF;

  RETURN QUERY SELECT
    ROUND(v_adaptive_limit, 2),
    v_risk_level,
    v_adjustment;
END;
$$;

-- Update calculate_discipline_metrics to log status changes
CREATE OR REPLACE FUNCTION public.calculate_discipline_metrics(_user_id uuid)
RETURNS TABLE(discipline_status text, discipline_score integer, can_trade boolean, trades_today integer, violations_today integer, streak_days integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rules RECORD;
  v_today DATE := CURRENT_DATE;
  v_trades_today INTEGER := 0;
  v_violations_today INTEGER := 0;
  v_total_risk_today DECIMAL := 0;
  v_streak_days INTEGER := 0;
  v_total_entries INTEGER := 0;
  v_compliant_entries INTEGER := 0;
  v_avg_emotion DECIMAL := 3;
  v_compliance_rate DECIMAL := 100;
  v_score INTEGER := 0;
  v_status TEXT := 'inactive';
  v_can_trade BOOLEAN := FALSE;
  v_previous_status TEXT := NULL;
BEGIN
  -- Get user's trading rules
  SELECT * INTO v_rules FROM trading_rules WHERE user_id = _user_id;
  
  IF v_rules IS NULL THEN
    RETURN QUERY SELECT 'inactive'::TEXT, 0, FALSE, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Get previous discipline status for comparison
  SELECT discipline_status INTO v_previous_status
  FROM profiles
  WHERE user_id = _user_id;
  
  -- Calculate today's metrics
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN NOT followed_rules THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(risk_used), 0)
  INTO v_trades_today, v_violations_today, v_total_risk_today
  FROM trade_entries 
  WHERE user_id = _user_id AND trade_date = v_today;
  
  -- Calculate streak (consecutive days with 100% compliance)
  WITH daily_compliance AS (
    SELECT 
      trade_date,
      BOOL_AND(followed_rules) as all_compliant
    FROM trade_entries
    WHERE user_id = _user_id
    GROUP BY trade_date
    ORDER BY trade_date DESC
  )
  SELECT COUNT(*) INTO v_streak_days
  FROM (
    SELECT trade_date, all_compliant,
           ROW_NUMBER() OVER (ORDER BY trade_date DESC) as rn
    FROM daily_compliance
  ) sub
  WHERE all_compliant = TRUE 
    AND rn = (SELECT COUNT(*) FROM daily_compliance dc2 
              WHERE dc2.trade_date >= sub.trade_date 
              AND dc2.all_compliant = TRUE);
  
  -- Calculate 30-day metrics
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN followed_rules THEN 1 ELSE 0 END), 0),
    COALESCE(AVG(emotional_state), 3)
  INTO v_total_entries, v_compliant_entries, v_avg_emotion
  FROM trade_entries 
  WHERE user_id = _user_id 
    AND trade_date >= v_today - INTERVAL '30 days';
  
  -- Calculate compliance rate
  IF v_total_entries > 0 THEN
    v_compliance_rate := (v_compliant_entries::DECIMAL / v_total_entries) * 100;
  END IF;
  
  -- Calculate discipline score (0-100)
  v_score := ROUND(
    (v_compliance_rate * 0.4) +
    (LEAST(v_streak_days::DECIMAL / 7, 1) * 20) +
    (((v_avg_emotion - 1) / 4) * 20) +
    (CASE 
      WHEN v_trades_today >= v_rules.max_trades_per_day THEN 10
      WHEN v_total_risk_today >= v_rules.max_daily_loss THEN 10
      ELSE 20
    END)
  );
  
  -- Determine discipline status
  IF v_violations_today > 0 OR v_total_risk_today >= v_rules.max_daily_loss OR v_score < 30 THEN
    v_status := 'locked';
  ELSE
    v_status := 'active';
  END IF;
  
  -- Determine if user can trade
  v_can_trade := (
    v_status = 'active' AND
    v_trades_today < v_rules.max_trades_per_day AND
    v_total_risk_today < v_rules.max_daily_loss AND
    v_violations_today = 0
  );
  
  -- LOG EVENT: When discipline becomes locked
  IF v_status = 'locked' AND (v_previous_status IS NULL OR v_previous_status != 'locked') THEN
    PERFORM log_vault_event(
      _user_id,
      'discipline_locked',
      jsonb_build_object(
        'discipline_score', v_score,
        'violations_today', v_violations_today,
        'timestamp', now()
      )
    );
  END IF;
  
  -- LOG EVENT: When discipline recovers from locked to active
  IF v_status = 'active' AND v_previous_status = 'locked' THEN
    PERFORM log_vault_event(
      _user_id,
      'discipline_recovered',
      jsonb_build_object(
        'discipline_score', v_score,
        'timestamp', now()
      )
    );
  END IF;
  
  -- Update profile with calculated values
  UPDATE profiles 
  SET 
    discipline_status = v_status,
    discipline_score = v_score,
    updated_at = NOW()
  WHERE user_id = _user_id;
  
  RETURN QUERY SELECT v_status, v_score, v_can_trade, v_trades_today, v_violations_today, v_streak_days;
END;
$function$;