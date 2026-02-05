-- Create Master Authority Function: get_vault_execution_permission
-- This is the FINAL authority before any trade executes

CREATE OR REPLACE FUNCTION public.get_vault_execution_permission(_user_id uuid)
RETURNS TABLE(
  execution_allowed boolean,
  block_reason text,
  effective_risk_limit numeric,
  cooldown_active boolean,
  cooldown_remaining_minutes integer,
  protection_level text,
  consistency_level text,
  discipline_status text,
  vault_open boolean,
  intervention_required boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vault_status RECORD;
  v_protection RECORD;
  v_consistency RECORD;
  v_adaptive_risk RECORD;
  v_daily_status RECORD;
  
  v_execution_allowed BOOLEAN := FALSE;
  v_block_reason TEXT := '';
  v_effective_risk_limit NUMERIC := 0;
  v_cooldown_active BOOLEAN := FALSE;
  v_cooldown_remaining INTEGER := 0;
  v_protection_level TEXT := 'NONE';
  v_consistency_level TEXT := 'GOOD';
  v_discipline_status TEXT := 'locked';
  v_vault_open BOOLEAN := FALSE;
  v_intervention_required BOOLEAN := FALSE;
  
  v_last_trade_time TIMESTAMPTZ := NULL;
  v_cooldown_end_time TIMESTAMPTZ := NULL;
BEGIN
  -- ============================================
  -- FETCH ALL AUTHORITY SOURCES
  -- ============================================
  
  -- Get vault status
  SELECT * INTO v_vault_status FROM get_vault_status(_user_id);
  
  -- Get protection status
  SELECT * INTO v_protection FROM get_vault_protection_status(_user_id);
  
  -- Get consistency status
  SELECT * INTO v_consistency FROM get_vault_consistency_status(_user_id);
  
  -- Get adaptive risk limit
  SELECT * INTO v_adaptive_risk FROM get_adaptive_risk_limit(_user_id);
  
  -- Get daily vault status
  SELECT * INTO v_daily_status FROM get_daily_vault_status(_user_id);
  
  -- ============================================
  -- EXTRACT VALUES WITH DEFAULTS
  -- ============================================
  
  -- From vault status
  IF v_vault_status IS NOT NULL THEN
    v_discipline_status := COALESCE(v_vault_status.discipline_status, 'locked');
  END IF;
  
  -- From protection status
  IF v_protection IS NOT NULL THEN
    v_protection_level := COALESCE(v_protection.protection_level, 'NONE');
    
    -- Check cooldown
    IF v_protection.trade_cooldown_minutes > 0 THEN
      SELECT MAX(created_at) INTO v_last_trade_time
      FROM trade_entries
      WHERE user_id = _user_id;
      
      IF v_last_trade_time IS NOT NULL THEN
        v_cooldown_end_time := v_last_trade_time + (v_protection.trade_cooldown_minutes * INTERVAL '1 minute');
        
        IF NOW() < v_cooldown_end_time THEN
          v_cooldown_active := TRUE;
          v_cooldown_remaining := CEIL(EXTRACT(EPOCH FROM (v_cooldown_end_time - NOW())) / 60);
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- From consistency status
  IF v_consistency IS NOT NULL THEN
    v_consistency_level := COALESCE(v_consistency.consistency_level, 'GOOD');
    v_intervention_required := COALESCE(v_consistency.intervention_required, FALSE);
  END IF;
  
  -- From adaptive risk limit
  IF v_adaptive_risk IS NOT NULL THEN
    v_effective_risk_limit := COALESCE(v_adaptive_risk.final_risk_limit, 0);
  END IF;
  
  -- From daily vault status
  IF v_daily_status IS NOT NULL THEN
    v_vault_open := COALESCE(v_daily_status.vault_open, FALSE);
  END IF;
  
  -- ============================================
  -- AUTHORITY PRIORITY CHAIN - BLOCK CHECKS
  -- ============================================
  
  -- PRIORITY 1: Discipline Status Locked
  IF v_discipline_status = 'locked' THEN
    v_execution_allowed := FALSE;
    v_block_reason := 'Discipline status is locked - trading suspended';
    
    PERFORM log_vault_event(
      _user_id,
      'execution_blocked',
      jsonb_build_object(
        'reason', 'discipline_locked',
        'discipline_status', v_discipline_status,
        'timestamp', now()
      )
    );
    
    RETURN QUERY SELECT
      v_execution_allowed,
      v_block_reason,
      v_effective_risk_limit,
      v_cooldown_active,
      v_cooldown_remaining,
      v_protection_level,
      v_consistency_level,
      v_discipline_status,
      v_vault_open,
      v_intervention_required;
    RETURN;
  END IF;
  
  -- PRIORITY 2: Protection Mode LOCKDOWN
  IF v_protection_level = 'LOCKDOWN' THEN
    v_execution_allowed := FALSE;
    v_block_reason := 'Vault Protection LOCKDOWN active - trading suspended for 24 hours';
    v_effective_risk_limit := 0;
    
    PERFORM log_vault_event(
      _user_id,
      'execution_blocked',
      jsonb_build_object(
        'reason', 'protection_lockdown',
        'protection_level', v_protection_level,
        'timestamp', now()
      )
    );
    
    RETURN QUERY SELECT
      v_execution_allowed,
      v_block_reason,
      v_effective_risk_limit,
      v_cooldown_active,
      v_cooldown_remaining,
      v_protection_level,
      v_consistency_level,
      v_discipline_status,
      v_vault_open,
      v_intervention_required;
    RETURN;
  END IF;
  
  -- PRIORITY 3: Cooldown Active
  IF v_cooldown_active THEN
    v_execution_allowed := FALSE;
    v_block_reason := format('Trade cooldown active - %s minutes remaining (Protection: %s)', 
      v_cooldown_remaining, v_protection_level);
    
    PERFORM log_vault_event(
      _user_id,
      'execution_blocked',
      jsonb_build_object(
        'reason', 'cooldown_active',
        'cooldown_remaining_minutes', v_cooldown_remaining,
        'protection_level', v_protection_level,
        'timestamp', now()
      )
    );
    
    RETURN QUERY SELECT
      v_execution_allowed,
      v_block_reason,
      v_effective_risk_limit,
      v_cooldown_active,
      v_cooldown_remaining,
      v_protection_level,
      v_consistency_level,
      v_discipline_status,
      v_vault_open,
      v_intervention_required;
    RETURN;
  END IF;
  
  -- PRIORITY 4: Vault Not Open (daily checklist not completed)
  IF NOT v_vault_open THEN
    v_execution_allowed := FALSE;
    v_block_reason := 'Vault is closed - complete daily checklist to open';
    
    PERFORM log_vault_event(
      _user_id,
      'execution_blocked',
      jsonb_build_object(
        'reason', 'vault_closed',
        'vault_open', v_vault_open,
        'timestamp', now()
      )
    );
    
    RETURN QUERY SELECT
      v_execution_allowed,
      v_block_reason,
      v_effective_risk_limit,
      v_cooldown_active,
      v_cooldown_remaining,
      v_protection_level,
      v_consistency_level,
      v_discipline_status,
      v_vault_open,
      v_intervention_required;
    RETURN;
  END IF;
  
  -- PRIORITY 5: Intervention Required (Consistency collapse)
  IF v_intervention_required THEN
    v_execution_allowed := FALSE;
    v_block_reason := format('Consistency intervention required - score critically low (%s level)', 
      v_consistency_level);
    v_effective_risk_limit := 0;
    
    PERFORM log_vault_event(
      _user_id,
      'execution_blocked',
      jsonb_build_object(
        'reason', 'intervention_required',
        'consistency_level', v_consistency_level,
        'intervention_required', v_intervention_required,
        'timestamp', now()
      )
    );
    
    RETURN QUERY SELECT
      v_execution_allowed,
      v_block_reason,
      v_effective_risk_limit,
      v_cooldown_active,
      v_cooldown_remaining,
      v_protection_level,
      v_consistency_level,
      v_discipline_status,
      v_vault_open,
      v_intervention_required;
    RETURN;
  END IF;
  
  -- ============================================
  -- ALL CHECKS PASSED - EXECUTION ALLOWED
  -- ============================================
  
  v_execution_allowed := TRUE;
  v_block_reason := 'All authority checks passed';
  
  -- Log successful permission
  PERFORM log_vault_event(
    _user_id,
    'execution_allowed',
    jsonb_build_object(
      'effective_risk_limit', v_effective_risk_limit,
      'protection_level', v_protection_level,
      'consistency_level', v_consistency_level,
      'discipline_status', v_discipline_status,
      'timestamp', now()
    )
  );
  
  RETURN QUERY SELECT
    v_execution_allowed,
    v_block_reason,
    v_effective_risk_limit,
    v_cooldown_active,
    v_cooldown_remaining,
    v_protection_level,
    v_consistency_level,
    v_discipline_status,
    v_vault_open,
    v_intervention_required;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_vault_execution_permission(uuid) TO authenticated;

-- ============================================
-- UPDATE check_trade_permission to use Master Authority
-- ============================================

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
  v_execution RECORD;
  v_rules RECORD;
  v_vault_status RECORD;
  v_today DATE := CURRENT_DATE;
  v_trades_today INTEGER := 0;
  v_daily_loss_used NUMERIC := 0;
  v_trades_remaining INTEGER := 0;
  v_daily_loss_remaining NUMERIC := 0;
  v_discipline_score INTEGER := 0;
BEGIN
  -- ============================================
  -- CALL MASTER AUTHORITY FUNCTION
  -- ============================================
  SELECT * INTO v_execution FROM get_vault_execution_permission(_user_id);
  
  -- Get trading rules for remaining calculations
  SELECT * INTO v_rules FROM trading_rules WHERE user_id = _user_id;
  
  IF v_rules IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Trading rules not configured'::text,
      0::integer,
      'locked'::text,
      0::integer,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Get discipline score from profile
  SELECT COALESCE(p.discipline_score, 0) INTO v_discipline_score
  FROM profiles p WHERE p.user_id = _user_id;
  
  -- Calculate today's usage
  SELECT COUNT(*), COALESCE(SUM(risk_used), 0)
  INTO v_trades_today, v_daily_loss_used
  FROM trade_entries 
  WHERE user_id = _user_id AND trade_date = v_today;
  
  v_trades_remaining := GREATEST(0, v_rules.max_trades_per_day - v_trades_today);
  v_daily_loss_remaining := GREATEST(0, v_rules.max_daily_loss - v_daily_loss_used);
  
  -- ============================================
  -- IF MASTER AUTHORITY BLOCKS, RETURN BLOCK
  -- ============================================
  IF NOT v_execution.execution_allowed THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      v_execution.block_reason,
      v_discipline_score,
      v_execution.discipline_status,
      v_trades_remaining,
      v_daily_loss_remaining,
      v_execution.effective_risk_limit;
    RETURN;
  END IF;
  
  -- ============================================
  -- ADDITIONAL LOCAL CHECKS (trade limits)
  -- ============================================
  
  -- Check trade count limit
  IF v_trades_today >= v_rules.max_trades_per_day THEN
    PERFORM log_vault_event(
      _user_id,
      'trade_blocked',
      jsonb_build_object(
        'reason', 'max_trades_reached',
        'trades_today', v_trades_today,
        'max_trades', v_rules.max_trades_per_day,
        'timestamp', now()
      )
    );
    
    RETURN QUERY SELECT 
      FALSE::boolean,
      format('Maximum trades reached (%s/%s)', v_trades_today, v_rules.max_trades_per_day)::text,
      v_discipline_score,
      v_execution.discipline_status,
      0::integer,
      v_daily_loss_remaining,
      v_execution.effective_risk_limit;
    RETURN;
  END IF;
  
  -- Check daily loss limit
  IF v_daily_loss_used >= v_rules.max_daily_loss THEN
    PERFORM log_vault_event(
      _user_id,
      'trade_blocked',
      jsonb_build_object(
        'reason', 'daily_loss_limit_reached',
        'daily_loss_used', v_daily_loss_used,
        'max_daily_loss', v_rules.max_daily_loss,
        'timestamp', now()
      )
    );
    
    RETURN QUERY SELECT 
      FALSE::boolean,
      format('Daily loss limit reached (%.1f%%/%.1f%%)', v_daily_loss_used, v_rules.max_daily_loss)::text,
      v_discipline_score,
      v_execution.discipline_status,
      v_trades_remaining,
      0::numeric,
      v_execution.effective_risk_limit;
    RETURN;
  END IF;
  
  -- ============================================
  -- ALL CHECKS PASSED
  -- ============================================
  
  RETURN QUERY SELECT 
    TRUE::boolean,
    format('Cleared for execution (Protection: %s, Consistency: %s)', 
      v_execution.protection_level, v_execution.consistency_level)::text,
    v_discipline_score,
    v_execution.discipline_status,
    v_trades_remaining,
    v_daily_loss_remaining,
    v_execution.effective_risk_limit;
END;
$$;

-- ============================================
-- UPDATE enforce_trade_permission trigger to use Master Authority
-- ============================================

CREATE OR REPLACE FUNCTION public.enforce_trade_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution RECORD;
BEGIN
  -- Call the MASTER AUTHORITY function
  SELECT * INTO v_execution
  FROM get_vault_execution_permission(NEW.user_id);
  
  -- If execution is not allowed, block the insert with the reason
  IF v_execution.execution_allowed = FALSE THEN
    RAISE EXCEPTION 'Trade blocked: %', v_execution.block_reason
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Additional check: verify risk doesn't exceed effective limit
  IF NEW.risk_used > v_execution.effective_risk_limit AND v_execution.effective_risk_limit > 0 THEN
    PERFORM log_vault_event(
      NEW.user_id,
      'execution_blocked',
      jsonb_build_object(
        'reason', 'risk_exceeds_limit',
        'risk_used', NEW.risk_used,
        'effective_risk_limit', v_execution.effective_risk_limit,
        'timestamp', now()
      )
    );
    
    RAISE EXCEPTION 'Trade blocked: Risk (%.2f%%) exceeds effective limit (%.2f%%)', 
      NEW.risk_used, v_execution.effective_risk_limit
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Permission granted - log the trade execution with full context
  PERFORM log_vault_event(
    NEW.user_id,
    'trade_executed',
    jsonb_build_object(
      'trade_id', NEW.id,
      'risk_used', NEW.risk_used,
      'followed_rules', NEW.followed_rules,
      'effective_risk_limit', v_execution.effective_risk_limit,
      'protection_level', v_execution.protection_level,
      'consistency_level', v_execution.consistency_level,
      'timestamp', now()
    )
  );
  
  -- Allow the insert
  RETURN NEW;
END;
$$;