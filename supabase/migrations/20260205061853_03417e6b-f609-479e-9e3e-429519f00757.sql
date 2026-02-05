-- Create the Vault Risk Engine position size calculator
-- Uses get_vault_status() as the authority layer for all risk decisions

CREATE OR REPLACE FUNCTION public.calculate_position_size(
  _user_id uuid,
  _account_size numeric,
  _risk_percent numeric,
  _stop_loss_percent numeric
)
RETURNS TABLE(
  allowed boolean,
  reason text,
  max_risk_allowed numeric,
  risk_percent numeric,
  max_loss_amount numeric,
  position_size numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vault_status RECORD;
  v_allowed BOOLEAN := FALSE;
  v_reason TEXT := '';
  v_max_risk_allowed NUMERIC := 0;
  v_max_loss_amount NUMERIC := 0;
  v_position_size NUMERIC := 0;
BEGIN
  -- Validate input parameters
  IF _account_size <= 0 THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Account size must be greater than zero'::text,
      0::numeric,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  IF _stop_loss_percent <= 0 THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Stop loss percentage must be greater than zero'::text,
      0::numeric,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  IF _risk_percent <= 0 THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Risk percentage must be greater than zero'::text,
      0::numeric,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Get vault status as the single source of truth
  SELECT * INTO v_vault_status
  FROM get_vault_status(_user_id);
  
  IF v_vault_status IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Unable to retrieve vault status'::text,
      0::numeric,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Set max risk allowed from vault authority
  v_max_risk_allowed := v_vault_status.max_risk_per_trade;
  
  -- Check if trading is allowed
  IF NOT v_vault_status.can_trade THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      format('Trading not allowed: %s', v_vault_status.reason)::text,
      v_max_risk_allowed,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Enforce max risk per trade rule
  IF _risk_percent > v_max_risk_allowed THEN
    v_reason := format('Risk exceeds maximum allowed (%.2f%% > %.2f%%)', _risk_percent, v_max_risk_allowed);
    
    RETURN QUERY SELECT 
      FALSE::boolean,
      v_reason,
      v_max_risk_allowed,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Check if this risk would exceed daily loss remaining
  IF _risk_percent > v_vault_status.daily_loss_remaining THEN
    v_reason := format('Risk would exceed daily loss limit (%.2f%% remaining)', v_vault_status.daily_loss_remaining);
    
    RETURN QUERY SELECT 
      FALSE::boolean,
      v_reason,
      v_max_risk_allowed,
      _risk_percent,
      0::numeric,
      0::numeric;
    RETURN;
  END IF;
  
  -- Calculate position sizing
  -- max_loss_amount = account_size * (risk_percent / 100)
  v_max_loss_amount := _account_size * (_risk_percent / 100);
  
  -- position_size = max_loss_amount / (stop_loss_percent / 100)
  -- This gives the maximum position value based on stop loss
  v_position_size := v_max_loss_amount / (_stop_loss_percent / 100);
  
  -- All checks passed
  v_allowed := TRUE;
  v_reason := 'Position size calculated within risk parameters';
  
  RETURN QUERY SELECT 
    v_allowed,
    v_reason,
    v_max_risk_allowed,
    _risk_percent,
    ROUND(v_max_loss_amount, 2),
    ROUND(v_position_size, 2);
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.calculate_position_size IS 'Vault Risk Engine: Calculates position size based on account size, risk percentage, and stop loss. Enforces trading rules from get_vault_status() authority.';