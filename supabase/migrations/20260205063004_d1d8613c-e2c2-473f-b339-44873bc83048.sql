-- Create get_vault_state function
-- Provides simplified state machine view: LOCKED, CAUTION, READY
-- Uses get_vault_status() as the authority layer

CREATE OR REPLACE FUNCTION public.get_vault_state(_user_id uuid)
RETURNS TABLE(
  vault_state text,
  can_trade boolean,
  state_reason text,
  discipline_score integer,
  discipline_rank text,
  risk_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status RECORD;
  v_state TEXT := 'LOCKED';
  v_reason TEXT := '';
  v_risk TEXT := 'HIGH';
BEGIN
  -- Get complete vault status from authority function
  SELECT * INTO v_status
  FROM get_vault_status(_user_id);

  IF v_status IS NULL THEN
    RETURN QUERY SELECT
      'LOCKED'::text,
      FALSE::boolean,
      'Vault status unavailable'::text,
      0::integer,
      'Unknown'::text,
      'HIGH'::text;
    RETURN;
  END IF;

  -- Determine vault state based on trading conditions
  IF v_status.can_trade = FALSE THEN
    v_state := 'LOCKED';
    v_reason := v_status.reason;
  ELSIF v_status.daily_loss_remaining < 1 THEN
    v_state := 'CAUTION';
    v_reason := 'Approaching daily loss limit';
  ELSIF v_status.trades_remaining <= 1 THEN
    v_state := 'CAUTION';
    v_reason := 'Trade limit nearly reached';
  ELSE
    v_state := 'READY';
    v_reason := 'All systems operational';
  END IF;

  -- Determine risk level based on discipline score
  IF v_status.discipline_score >= 80 THEN
    v_risk := 'LOW';
  ELSIF v_status.discipline_score >= 50 THEN
    v_risk := 'MEDIUM';
  ELSE
    v_risk := 'HIGH';
  END IF;

  RETURN QUERY SELECT
    v_state,
    v_status.can_trade,
    v_reason,
    v_status.discipline_score,
    v_status.discipline_rank,
    v_risk;
END;
$$;

-- Add documentation comment
COMMENT ON FUNCTION public.get_vault_state IS 'Vault State Machine: Returns simplified LOCKED/CAUTION/READY state with risk level. Uses get_vault_status() as authority.';