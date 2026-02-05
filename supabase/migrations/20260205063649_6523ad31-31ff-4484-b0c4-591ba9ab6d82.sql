-- Create log_vault_event function for standardized event logging
CREATE OR REPLACE FUNCTION public.log_vault_event(
  _user_id uuid,
  _event_type text,
  _event_context jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.vault_events (user_id, event_type, event_context)
  VALUES (_user_id, _event_type, _event_context)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Add documentation
COMMENT ON FUNCTION public.log_vault_event IS 'Logs vault events for audit trail. Use for trades, rule changes, discipline updates, and system events.';