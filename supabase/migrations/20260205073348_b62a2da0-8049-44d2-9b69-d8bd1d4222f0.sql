
-- Create function to get vault protection status with behavioral risk detection
CREATE OR REPLACE FUNCTION public.get_vault_protection_status(_user_id uuid)
RETURNS TABLE(
  protection_active boolean,
  protection_level text,
  protection_reason text,
  risk_restriction_factor numeric,
  trade_cooldown_minutes integer,
  emotional_risk boolean,
  revenge_trading_risk boolean,
  overtrading_risk boolean,
  discipline_deterioration_risk boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_protection_active boolean := false;
  v_protection_level text := 'NONE';
  v_protection_reason text := 'No protection required';
  v_risk_restriction_factor numeric := 1.0;
  v_trade_cooldown_minutes integer := 0;
  v_emotional_risk boolean := false;
  v_revenge_trading_risk boolean := false;
  v_overtrading_risk boolean := false;
  v_discipline_deterioration_risk boolean := false;
  
  v_trades_today integer;
  v_max_trades_per_day integer;
  v_current_discipline_score integer;
  v_discipline_24h_ago integer;
  v_avg_emotional_state numeric;
  v_recent_loss_or_violation_time timestamptz;
  v_trades_after_loss integer;
  v_severity_score integer := 0;
  v_reasons text[] := ARRAY[]::text[];
  v_previous_protection_level text;
BEGIN
  -- Get trading rules
  SELECT max_trades_per_day INTO v_max_trades_per_day
  FROM trading_rules
  WHERE user_id = _user_id
  LIMIT 1;
  
  v_max_trades_per_day := COALESCE(v_max_trades_per_day, 3);
  
  -- Get trades taken today
  SELECT COUNT(*) INTO v_trades_today
  FROM trade_entries
  WHERE user_id = _user_id
    AND trade_date::date = CURRENT_DATE;
  
  -- Get current discipline score
  SELECT discipline_score INTO v_current_discipline_score
  FROM profiles
  WHERE user_id = _user_id
  LIMIT 1;
  
  v_current_discipline_score := COALESCE(v_current_discipline_score, 50);
  
  -- Check discipline score 24 hours ago from vault_events
  SELECT COALESCE(
    (event_context->>'discipline_score')::integer,
    v_current_discipline_score
  ) INTO v_discipline_24h_ago
  FROM vault_events
  WHERE user_id = _user_id
    AND created_at <= NOW() - INTERVAL '24 hours'
    AND event_context->>'discipline_score' IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  v_discipline_24h_ago := COALESCE(v_discipline_24h_ago, v_current_discipline_score);
  
  -- Check average emotional state in last 3 trades
  SELECT AVG(emotional_state) INTO v_avg_emotional_state
  FROM (
    SELECT emotional_state
    FROM trade_entries
    WHERE user_id = _user_id
    ORDER BY created_at DESC
    LIMIT 3
  ) recent_trades;
  
  -- Check for recent loss or violation (last 15 minutes)
  SELECT MAX(created_at) INTO v_recent_loss_or_violation_time
  FROM (
    -- Trades that broke rules
    SELECT created_at
    FROM trade_entries
    WHERE user_id = _user_id
      AND followed_rules = false
      AND created_at >= NOW() - INTERVAL '15 minutes'
    UNION ALL
    -- Violation events
    SELECT created_at
    FROM vault_events
    WHERE user_id = _user_id
      AND event_type LIKE '%violation%'
      AND created_at >= NOW() - INTERVAL '15 minutes'
  ) recent_issues;
  
  -- Count trades after loss/violation (revenge trading detection)
  IF v_recent_loss_or_violation_time IS NOT NULL THEN
    SELECT COUNT(*) INTO v_trades_after_loss
    FROM trade_entries
    WHERE user_id = _user_id
      AND created_at > v_recent_loss_or_violation_time;
    
    IF v_trades_after_loss >= 2 THEN
      v_revenge_trading_risk := true;
      v_severity_score := v_severity_score + 3;
      v_reasons := array_append(v_reasons, 'Revenge trading detected: ' || v_trades_after_loss || ' trades after recent loss');
    END IF;
  END IF;
  
  -- Check emotional instability
  IF v_avg_emotional_state IS NOT NULL AND (v_avg_emotional_state <= 2 OR v_avg_emotional_state >= 5) THEN
    v_emotional_risk := true;
    v_severity_score := v_severity_score + 2;
    IF v_avg_emotional_state <= 2 THEN
      v_reasons := array_append(v_reasons, 'Emotional instability: Low emotional control (avg: ' || ROUND(v_avg_emotional_state, 1) || ')');
    ELSE
      v_reasons := array_append(v_reasons, 'Emotional instability: High emotional volatility (avg: ' || ROUND(v_avg_emotional_state, 1) || ')');
    END IF;
  END IF;
  
  -- Check overtrading risk (>= 80% of daily max)
  IF v_max_trades_per_day > 0 AND v_trades_today >= (v_max_trades_per_day * 0.8) THEN
    v_overtrading_risk := true;
    v_severity_score := v_severity_score + 2;
    v_reasons := array_append(v_reasons, 'Overtrading risk: ' || v_trades_today || '/' || v_max_trades_per_day || ' trades used');
  END IF;
  
  -- Check discipline deterioration (>15 points drop in 24h)
  IF (v_discipline_24h_ago - v_current_discipline_score) > 15 THEN
    v_discipline_deterioration_risk := true;
    v_severity_score := v_severity_score + 3;
    v_reasons := array_append(v_reasons, 'Discipline deterioration: Score dropped ' || (v_discipline_24h_ago - v_current_discipline_score) || ' points in 24h');
  END IF;
  
  -- Determine protection level based on severity
  IF v_severity_score >= 6 THEN
    v_protection_level := 'LOCKDOWN';
    v_protection_active := true;
    v_risk_restriction_factor := 0;
    v_trade_cooldown_minutes := 1440;
    v_protection_reason := 'Critical behavioral risk: ' || array_to_string(v_reasons, '; ');
  ELSIF v_severity_score >= 4 THEN
    v_protection_level := 'RESTRICTED';
    v_protection_active := true;
    v_risk_restriction_factor := 0.50;
    v_trade_cooldown_minutes := 30;
    v_protection_reason := 'Elevated behavioral risk: ' || array_to_string(v_reasons, '; ');
  ELSIF v_severity_score >= 2 THEN
    v_protection_level := 'CAUTION';
    v_protection_active := true;
    v_risk_restriction_factor := 0.75;
    v_trade_cooldown_minutes := 0;
    v_protection_reason := 'Warning: ' || array_to_string(v_reasons, '; ');
  ELSE
    v_protection_level := 'NONE';
    v_protection_active := false;
    v_risk_restriction_factor := 1.0;
    v_trade_cooldown_minutes := 0;
    v_protection_reason := 'No protection required';
  END IF;
  
  -- Check if protection level changed and log event
  SELECT event_context->>'protection_level' INTO v_previous_protection_level
  FROM vault_events
  WHERE user_id = _user_id
    AND event_type LIKE 'protection_mode_%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Log protection mode changes
  IF v_previous_protection_level IS DISTINCT FROM v_protection_level THEN
    IF v_protection_level = 'NONE' AND v_previous_protection_level IS NOT NULL THEN
      PERFORM log_vault_event(
        _user_id,
        'protection_mode_deactivated',
        jsonb_build_object(
          'protection_level', v_protection_level,
          'previous_level', v_previous_protection_level,
          'reason', v_protection_reason
        )
      );
    ELSIF v_previous_protection_level IS NULL OR v_previous_protection_level = 'NONE' THEN
      PERFORM log_vault_event(
        _user_id,
        'protection_mode_activated',
        jsonb_build_object(
          'protection_level', v_protection_level,
          'reason', v_protection_reason,
          'risk_restriction_factor', v_risk_restriction_factor,
          'cooldown_minutes', v_trade_cooldown_minutes
        )
      );
    ELSE
      PERFORM log_vault_event(
        _user_id,
        'protection_mode_escalated',
        jsonb_build_object(
          'protection_level', v_protection_level,
          'previous_level', v_previous_protection_level,
          'reason', v_protection_reason,
          'risk_restriction_factor', v_risk_restriction_factor,
          'cooldown_minutes', v_trade_cooldown_minutes
        )
      );
    END IF;
  END IF;
  
  RETURN QUERY SELECT
    v_protection_active,
    v_protection_level,
    v_protection_reason,
    v_risk_restriction_factor,
    v_trade_cooldown_minutes,
    v_emotional_risk,
    v_revenge_trading_risk,
    v_overtrading_risk,
    v_discipline_deterioration_risk;
END;
$$;
