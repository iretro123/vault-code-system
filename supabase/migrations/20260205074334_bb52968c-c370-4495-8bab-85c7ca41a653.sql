-- Drop and recreate get_adaptive_risk_limit with new return type
DROP FUNCTION IF EXISTS public.get_adaptive_risk_limit(uuid);

-- Create Vault Consistency Authority Engine
-- Detects discipline deterioration trends and applies preventive intervention

CREATE OR REPLACE FUNCTION public.get_vault_consistency_status(_user_id uuid)
RETURNS TABLE(
  consistency_score integer,
  consistency_level text,
  trend_direction text,
  discipline_velocity numeric,
  risk_velocity numeric,
  emotional_stability numeric,
  violation_trend numeric,
  intervention_required boolean,
  recommended_risk_modifier numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trades_7d RECORD;
  v_trades_30d RECORD;
  v_adherence_trend numeric := 0;
  v_risk_trend numeric := 0;
  v_emotion_trend numeric := 0;
  v_violation_trend numeric := 0;
  v_discipline_trend numeric := 0;
  v_consistency_score integer := 100;
  v_consistency_level text := 'EXCELLENT';
  v_trend_direction text := 'STABLE';
  v_discipline_velocity numeric := 0;
  v_risk_velocity numeric := 0;
  v_emotional_stability numeric := 0;
  v_intervention_required boolean := false;
  v_recommended_risk_modifier numeric := 1.0;
  v_trades_7d_count integer := 0;
  v_trades_30d_count integer := 0;
  v_first_half_7d RECORD;
  v_second_half_7d RECORD;
  v_first_half_30d RECORD;
  v_second_half_30d RECORD;
  v_discipline_7d_ago numeric;
  v_discipline_now numeric;
  v_risk_7d_ago numeric;
  v_risk_now numeric;
  v_emotion_stddev numeric := 0;
  v_violations_first_half integer := 0;
  v_violations_second_half integer := 0;
  v_previous_consistency integer;
  v_event_logged boolean := false;
BEGIN
  -- Get 7-day trade stats
  SELECT 
    COUNT(*) as total_trades,
    COALESCE(AVG(CASE WHEN followed_rules THEN 1.0 ELSE 0.0 END), 0) as adherence_rate,
    COALESCE(AVG(risk_used), 0) as avg_risk,
    COALESCE(AVG(emotional_state), 3) as avg_emotion,
    COALESCE(COUNT(*) FILTER (WHERE NOT followed_rules), 0) as violations
  INTO v_trades_7d
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date >= CURRENT_DATE - INTERVAL '7 days';
  
  v_trades_7d_count := COALESCE(v_trades_7d.total_trades, 0);

  -- Get 30-day trade stats
  SELECT 
    COUNT(*) as total_trades,
    COALESCE(AVG(CASE WHEN followed_rules THEN 1.0 ELSE 0.0 END), 0) as adherence_rate,
    COALESCE(AVG(risk_used), 0) as avg_risk,
    COALESCE(AVG(emotional_state), 3) as avg_emotion,
    COALESCE(COUNT(*) FILTER (WHERE NOT followed_rules), 0) as violations
  INTO v_trades_30d
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date >= CURRENT_DATE - INTERVAL '30 days';
  
  v_trades_30d_count := COALESCE(v_trades_30d.total_trades, 0);

  -- Calculate trends by comparing first half vs second half of periods
  -- 7-day first half (days 4-7 ago)
  SELECT 
    COALESCE(AVG(CASE WHEN followed_rules THEN 1.0 ELSE 0.0 END), 0) as adherence_rate,
    COALESCE(AVG(risk_used), 0) as avg_risk,
    COALESCE(AVG(emotional_state), 3) as avg_emotion,
    COALESCE(COUNT(*) FILTER (WHERE NOT followed_rules), 0) as violations
  INTO v_first_half_7d
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date >= CURRENT_DATE - INTERVAL '7 days'
    AND trade_date < CURRENT_DATE - INTERVAL '3 days';

  -- 7-day second half (last 3 days)
  SELECT 
    COALESCE(AVG(CASE WHEN followed_rules THEN 1.0 ELSE 0.0 END), 0) as adherence_rate,
    COALESCE(AVG(risk_used), 0) as avg_risk,
    COALESCE(AVG(emotional_state), 3) as avg_emotion,
    COALESCE(COUNT(*) FILTER (WHERE NOT followed_rules), 0) as violations
  INTO v_second_half_7d
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date >= CURRENT_DATE - INTERVAL '3 days';

  -- 30-day first half
  SELECT 
    COALESCE(AVG(CASE WHEN followed_rules THEN 1.0 ELSE 0.0 END), 0) as adherence_rate,
    COALESCE(AVG(risk_used), 0) as avg_risk,
    COALESCE(COUNT(*) FILTER (WHERE NOT followed_rules), 0) as violations
  INTO v_first_half_30d
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date >= CURRENT_DATE - INTERVAL '30 days'
    AND trade_date < CURRENT_DATE - INTERVAL '15 days';

  -- 30-day second half
  SELECT 
    COALESCE(AVG(CASE WHEN followed_rules THEN 1.0 ELSE 0.0 END), 0) as adherence_rate,
    COALESCE(AVG(risk_used), 0) as avg_risk,
    COALESCE(COUNT(*) FILTER (WHERE NOT followed_rules), 0) as violations
  INTO v_second_half_30d
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date >= CURRENT_DATE - INTERVAL '15 days';

  -- Calculate Adherence Trend (-100 to +100)
  v_adherence_trend := (v_second_half_7d.adherence_rate - v_first_half_7d.adherence_rate) * 100;

  -- Calculate Risk Trend (negative is better - using less risk)
  v_risk_trend := (v_second_half_7d.avg_risk - v_first_half_7d.avg_risk) * -10;

  -- Calculate Emotion Trend (higher emotional state is better)
  v_emotion_trend := (v_second_half_7d.avg_emotion - v_first_half_7d.avg_emotion) * 20;

  -- Calculate Violation Trend
  v_violations_first_half := COALESCE(v_first_half_7d.violations, 0);
  v_violations_second_half := COALESCE(v_second_half_7d.violations, 0);
  v_violation_trend := (v_violations_first_half - v_violations_second_half)::numeric;

  -- Calculate Discipline Velocity (score change over 7 days)
  SELECT discipline_score INTO v_discipline_now
  FROM profiles WHERE user_id = _user_id;
  
  -- Estimate 7-day-ago discipline from recent events
  SELECT COALESCE(
    (event_context->>'discipline_score')::numeric,
    v_discipline_now
  ) INTO v_discipline_7d_ago
  FROM vault_events
  WHERE user_id = _user_id
    AND created_at >= NOW() - INTERVAL '7 days'
    AND event_context->>'discipline_score' IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1;
  
  v_discipline_velocity := COALESCE((v_discipline_now - COALESCE(v_discipline_7d_ago, v_discipline_now)) / 7.0, 0);

  -- Calculate Risk Velocity
  SELECT COALESCE(AVG(risk_used), 0) INTO v_risk_7d_ago
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date >= CURRENT_DATE - INTERVAL '7 days'
    AND trade_date < CURRENT_DATE - INTERVAL '3 days';
  
  SELECT COALESCE(AVG(risk_used), 0) INTO v_risk_now
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date >= CURRENT_DATE - INTERVAL '3 days';
  
  v_risk_velocity := COALESCE(v_risk_now - v_risk_7d_ago, 0);

  -- Calculate Emotional Stability (standard deviation of last 10 trades)
  SELECT COALESCE(STDDEV_POP(emotional_state), 0) INTO v_emotion_stddev
  FROM (
    SELECT emotional_state
    FROM trade_entries
    WHERE user_id = _user_id
    ORDER BY trade_date DESC
    LIMIT 10
  ) recent_trades;
  
  -- Convert stddev to stability score (lower stddev = higher stability)
  v_emotional_stability := GREATEST(0, 100 - (v_emotion_stddev * 25));

  -- Calculate Consistency Score
  -- Base score starts at 50, modified by trends
  v_consistency_score := 50;
  
  -- Add adherence component (up to 25 points)
  v_consistency_score := v_consistency_score + LEAST(25, GREATEST(-25, v_adherence_trend::integer / 4));
  
  -- Add violation component (up to 15 points)
  v_consistency_score := v_consistency_score + LEAST(15, GREATEST(-15, v_violation_trend::integer * 5));
  
  -- Add emotional stability component (up to 10 points)
  v_consistency_score := v_consistency_score + LEAST(10, GREATEST(-10, (v_emotional_stability::integer - 50) / 5));
  
  -- Add discipline velocity component (up to 10 points)
  v_consistency_score := v_consistency_score + LEAST(10, GREATEST(-10, v_discipline_velocity::integer * 2));
  
  -- Adjust for trade count (no trades = neutral)
  IF v_trades_7d_count = 0 THEN
    v_consistency_score := 70; -- Default to stable if no recent activity
  END IF;

  -- Clamp to 0-100
  v_consistency_score := GREATEST(0, LEAST(100, v_consistency_score));

  -- Determine Trend Direction
  IF v_adherence_trend > 10 AND v_discipline_velocity > 0.5 THEN
    v_trend_direction := 'IMPROVING';
  ELSIF v_adherence_trend < -20 AND v_discipline_velocity < -1 THEN
    v_trend_direction := 'COLLAPSING';
  ELSIF v_adherence_trend < -10 OR v_discipline_velocity < -0.5 THEN
    v_trend_direction := 'DECLINING';
  ELSE
    v_trend_direction := 'STABLE';
  END IF;

  -- Determine Consistency Level
  IF v_consistency_score >= 80 THEN
    v_consistency_level := 'EXCELLENT';
  ELSIF v_consistency_score >= 65 THEN
    v_consistency_level := 'GOOD';
  ELSIF v_consistency_score >= 50 THEN
    v_consistency_level := 'DEVELOPING';
  ELSIF v_consistency_score >= 35 THEN
    v_consistency_level := 'UNSTABLE';
  ELSE
    v_consistency_level := 'CRITICAL';
  END IF;

  -- Intervention Logic
  IF v_consistency_score < 20 THEN
    v_recommended_risk_modifier := 0;
    v_intervention_required := true;
  ELSIF v_consistency_score < 30 THEN
    v_recommended_risk_modifier := 0.25;
  ELSIF v_consistency_score < 45 THEN
    v_recommended_risk_modifier := 0.50;
  ELSIF v_consistency_score < 60 THEN
    v_recommended_risk_modifier := 0.75;
  ELSE
    v_recommended_risk_modifier := 1.0;
  END IF;

  -- Log vault events for trend changes
  -- Check for previous consistency to detect changes
  SELECT (event_context->>'consistency_score')::integer INTO v_previous_consistency
  FROM vault_events
  WHERE user_id = _user_id
    AND event_type IN ('consistency_declining', 'consistency_collapsing', 'consistency_recovering', 'consistency_status')
    AND created_at >= NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Log appropriate event based on state change
  IF v_previous_consistency IS NOT NULL THEN
    IF v_trend_direction = 'COLLAPSING' AND v_previous_consistency > v_consistency_score THEN
      PERFORM log_vault_event(
        _user_id,
        'consistency_collapsing',
        jsonb_build_object(
          'consistency_score', v_consistency_score,
          'previous_score', v_previous_consistency,
          'trend_direction', v_trend_direction,
          'intervention_required', v_intervention_required,
          'risk_modifier', v_recommended_risk_modifier
        )
      );
      v_event_logged := true;
    ELSIF v_trend_direction = 'DECLINING' AND v_previous_consistency > v_consistency_score THEN
      PERFORM log_vault_event(
        _user_id,
        'consistency_declining',
        jsonb_build_object(
          'consistency_score', v_consistency_score,
          'previous_score', v_previous_consistency,
          'trend_direction', v_trend_direction,
          'risk_modifier', v_recommended_risk_modifier
        )
      );
      v_event_logged := true;
    ELSIF v_trend_direction = 'IMPROVING' AND v_previous_consistency < v_consistency_score THEN
      PERFORM log_vault_event(
        _user_id,
        'consistency_recovering',
        jsonb_build_object(
          'consistency_score', v_consistency_score,
          'previous_score', v_previous_consistency,
          'trend_direction', v_trend_direction,
          'risk_modifier', v_recommended_risk_modifier
        )
      );
      v_event_logged := true;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_consistency_score,
    v_consistency_level,
    v_trend_direction,
    ROUND(v_discipline_velocity, 2),
    ROUND(v_risk_velocity, 2),
    ROUND(v_emotional_stability, 2),
    ROUND(v_violation_trend, 2),
    v_intervention_required,
    ROUND(v_recommended_risk_modifier, 2);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_vault_consistency_status(uuid) TO authenticated;

-- Recreate get_adaptive_risk_limit with expanded return type including modifiers
CREATE FUNCTION public.get_adaptive_risk_limit(_user_id uuid)
RETURNS TABLE(
  adaptive_risk_limit numeric,
  adjustment_factor numeric,
  risk_level text,
  consistency_modifier numeric,
  protection_modifier numeric,
  final_risk_limit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_risk numeric := 1.0;
  v_adjustment_factor numeric := 1.0;
  v_risk_level text := 'NORMAL';
  v_discipline_score integer;
  v_discipline_status text;
  v_violations_today integer;
  v_streak_days integer;
  v_protection RECORD;
  v_consistency RECORD;
  v_consistency_modifier numeric := 1.0;
  v_protection_modifier numeric := 1.0;
  v_final_limit numeric;
BEGIN
  -- Get user's base max risk from trading_rules
  SELECT max_risk_per_trade INTO v_base_risk
  FROM trading_rules
  WHERE user_id = _user_id;
  
  IF v_base_risk IS NULL THEN
    v_base_risk := 1.0;
  END IF;

  -- Get discipline metrics
  SELECT discipline_score, discipline_status
  INTO v_discipline_score, v_discipline_status
  FROM profiles
  WHERE user_id = _user_id;

  -- Get violations today
  SELECT COUNT(*) INTO v_violations_today
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date = CURRENT_DATE
    AND NOT followed_rules;

  -- Get streak days from vault events
  SELECT COALESCE(
    (SELECT COUNT(DISTINCT DATE(created_at))
     FROM vault_events
     WHERE user_id = _user_id
       AND event_type = 'daily_checklist_completed'
       AND created_at >= CURRENT_DATE - INTERVAL '30 days'),
    0
  ) INTO v_streak_days;

  -- Calculate base adjustment factor
  IF v_discipline_score >= 90 THEN
    v_adjustment_factor := 1.2;
    v_risk_level := 'ELEVATED';
  ELSIF v_discipline_score >= 75 THEN
    v_adjustment_factor := 1.0;
    v_risk_level := 'NORMAL';
  ELSIF v_discipline_score >= 60 THEN
    v_adjustment_factor := 0.85;
    v_risk_level := 'REDUCED';
  ELSIF v_discipline_score >= 40 THEN
    v_adjustment_factor := 0.65;
    v_risk_level := 'RESTRICTED';
  ELSE
    v_adjustment_factor := 0.5;
    v_risk_level := 'MINIMAL';
  END IF;

  -- Reduce for violations
  IF v_violations_today >= 2 THEN
    v_adjustment_factor := v_adjustment_factor * 0.5;
    v_risk_level := 'VIOLATION_RESTRICTED';
  ELSIF v_violations_today = 1 THEN
    v_adjustment_factor := v_adjustment_factor * 0.75;
  END IF;

  -- Get protection status
  SELECT * INTO v_protection
  FROM get_vault_protection_status(_user_id);

  IF v_protection IS NOT NULL THEN
    IF v_protection.protection_level = 'LOCKDOWN' THEN
      v_protection_modifier := 0;
      v_risk_level := 'LOCKDOWN';
    ELSE
      v_protection_modifier := COALESCE(v_protection.risk_restriction_factor, 1.0);
    END IF;
  END IF;

  -- Get consistency status
  SELECT * INTO v_consistency
  FROM get_vault_consistency_status(_user_id);

  IF v_consistency IS NOT NULL THEN
    v_consistency_modifier := COALESCE(v_consistency.recommended_risk_modifier, 1.0);
    
    -- If intervention required, override risk level
    IF v_consistency.intervention_required THEN
      v_risk_level := 'INTERVENTION_REQUIRED';
    END IF;
  END IF;

  -- Calculate final risk limit
  v_final_limit := v_base_risk * v_adjustment_factor * v_protection_modifier * v_consistency_modifier;

  -- Log if risk is being significantly reduced
  IF v_final_limit < v_base_risk * 0.5 THEN
    PERFORM log_vault_event(
      _user_id,
      'risk_level_changed',
      jsonb_build_object(
        'base_risk', v_base_risk,
        'adjustment_factor', v_adjustment_factor,
        'protection_modifier', v_protection_modifier,
        'consistency_modifier', v_consistency_modifier,
        'final_limit', v_final_limit,
        'risk_level', v_risk_level
      )
    );
  END IF;

  RETURN QUERY SELECT
    ROUND(v_base_risk * v_adjustment_factor, 2),
    ROUND(v_adjustment_factor, 2),
    v_risk_level,
    ROUND(v_consistency_modifier, 2),
    ROUND(v_protection_modifier, 2),
    ROUND(v_final_limit, 2);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_adaptive_risk_limit(uuid) TO authenticated;