
-- Modify get_adaptive_risk_limit to integrate protection mode
CREATE OR REPLACE FUNCTION public.get_adaptive_risk_limit(_user_id uuid)
RETURNS TABLE(adaptive_risk_limit numeric, risk_level text, adjustment_factor numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status RECORD;
  v_protection RECORD;
  v_adaptive_limit NUMERIC := 0;
  v_risk_level TEXT := 'LOCKED';
  v_adjustment NUMERIC := 0;
  v_last_risk_level TEXT := NULL;
  v_final_limit NUMERIC := 0;
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

  -- Get protection status
  SELECT * INTO v_protection
  FROM get_vault_protection_status(_user_id);

  -- If protection mode is LOCKDOWN, return 0 immediately
  IF v_protection IS NOT NULL AND v_protection.protection_level = 'LOCKDOWN' THEN
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

  -- Apply protection mode risk restriction factor
  IF v_protection IS NOT NULL AND v_protection.risk_restriction_factor < 1.0 THEN
    v_final_limit := v_adaptive_limit * v_protection.risk_restriction_factor;
    v_adjustment := v_adjustment * v_protection.risk_restriction_factor;
    
    -- Update risk level to indicate protection is active
    IF v_protection.protection_level = 'RESTRICTED' THEN
      v_risk_level := 'PROTECTION_RESTRICTED';
    ELSIF v_protection.protection_level = 'CAUTION' THEN
      v_risk_level := 'PROTECTION_CAUTION';
    END IF;
  ELSE
    v_final_limit := v_adaptive_limit;
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
        'previous_level', COALESCE(v_last_risk_level, 'NONE'),
        'protection_active', COALESCE(v_protection.protection_active, false),
        'protection_level', COALESCE(v_protection.protection_level, 'NONE')
      )
    );
  END IF;

  RETURN QUERY SELECT
    ROUND(v_final_limit, 2),
    v_risk_level,
    v_adjustment;
END;
$$;

-- Modify check_trade_permission to integrate protection mode with cooldown enforcement
CREATE OR REPLACE FUNCTION public.check_trade_permission(_user_id uuid)
RETURNS TABLE(can_trade boolean, reason text, discipline_score integer, discipline_status text, trades_remaining integer, daily_loss_remaining numeric, max_risk_per_trade numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules RECORD;
  v_metrics RECORD;
  v_protection RECORD;
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
  v_last_trade_time TIMESTAMPTZ := NULL;
  v_cooldown_end_time TIMESTAMPTZ := NULL;
  v_cooldown_remaining_minutes INTEGER := 0;
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
  
  -- Get protection status FIRST - this is critical authority check
  SELECT * INTO v_protection
  FROM get_vault_protection_status(_user_id);
  
  -- PROTECTION MODE LOCKDOWN CHECK - Block immediately
  IF v_protection IS NOT NULL AND v_protection.protection_level = 'LOCKDOWN' THEN
    -- Log the blocked trade attempt
    PERFORM log_vault_event(
      _user_id,
      'trade_blocked_protection_mode',
      jsonb_build_object(
        'protection_level', 'LOCKDOWN',
        'reason', 'Vault Protection Lockdown Active',
        'risk_restriction_factor', v_protection.risk_restriction_factor,
        'timestamp', now()
      )
    );
    
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Vault Protection Lockdown Active - Trading suspended for 24 hours'::text,
      0::integer,
      'locked'::text,
      0::integer,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- PROTECTION MODE COOLDOWN CHECK
  IF v_protection IS NOT NULL AND v_protection.trade_cooldown_minutes > 0 THEN
    -- Get last trade timestamp
    SELECT MAX(created_at) INTO v_last_trade_time
    FROM trade_entries
    WHERE user_id = _user_id;
    
    IF v_last_trade_time IS NOT NULL THEN
      v_cooldown_end_time := v_last_trade_time + (v_protection.trade_cooldown_minutes * INTERVAL '1 minute');
      
      IF NOW() < v_cooldown_end_time THEN
        v_cooldown_remaining_minutes := CEIL(EXTRACT(EPOCH FROM (v_cooldown_end_time - NOW())) / 60);
        
        -- Log the blocked trade attempt due to cooldown
        PERFORM log_vault_event(
          _user_id,
          'trade_blocked_protection_mode',
          jsonb_build_object(
            'protection_level', v_protection.protection_level,
            'reason', 'Trade cooldown active',
            'cooldown_remaining_minutes', v_cooldown_remaining_minutes,
            'cooldown_end_time', v_cooldown_end_time,
            'timestamp', now()
          )
        );
        
        RETURN QUERY SELECT 
          FALSE::boolean,
          format('Trade cooldown active - %s minutes remaining (Protection: %s)', 
            v_cooldown_remaining_minutes, v_protection.protection_level)::text,
          0::integer,
          'cooldown'::text,
          0::integer,
          0::numeric,
          0::numeric;
        RETURN;
      END IF;
    END IF;
  END IF;
  
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
  
  -- Apply protection mode risk restriction to max_risk_per_trade
  IF v_protection IS NOT NULL AND v_protection.risk_restriction_factor < 1.0 THEN
    v_max_risk_per_trade := v_max_risk_per_trade * v_protection.risk_restriction_factor;
  END IF;
  
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
    
    -- Add protection mode note if active
    IF v_protection IS NOT NULL AND v_protection.protection_active THEN
      v_reason := format('Cleared with Protection Mode: %s (Risk limited to %.0f%%)', 
        v_protection.protection_level, v_protection.risk_restriction_factor * 100);
    END IF;
  END IF;
  
  -- LOG EVENT: When trade is blocked (not protection-related, handled above)
  IF v_can_trade = FALSE THEN
    PERFORM log_vault_event(
      _user_id,
      'trade_blocked',
      jsonb_build_object(
        'reason', v_reason,
        'discipline_score', v_discipline_score,
        'protection_active', COALESCE(v_protection.protection_active, false),
        'protection_level', COALESCE(v_protection.protection_level, 'NONE'),
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
    ROUND(v_max_risk_per_trade, 2);
END;
$$;
