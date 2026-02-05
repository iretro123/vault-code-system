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
SET search_path TO 'public'
AS $function$
DECLARE
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

  -- Discipline status comes from profile directly (avoid get_vault_status to prevent recursion)
  SELECT p.discipline_status INTO v_discipline_status
  FROM profiles p
  WHERE p.user_id = _user_id;
  v_discipline_status := COALESCE(v_discipline_status, 'locked');

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

  -- From protection status
  IF v_protection IS NOT NULL THEN
    v_protection_level := COALESCE(v_protection.protection_level, 'NONE');

    -- Check cooldown
    IF v_protection.trade_cooldown_minutes > 0 THEN
      SELECT MAX(te.created_at) INTO v_last_trade_time
      FROM trade_entries te
      WHERE te.user_id = _user_id;

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
$function$;