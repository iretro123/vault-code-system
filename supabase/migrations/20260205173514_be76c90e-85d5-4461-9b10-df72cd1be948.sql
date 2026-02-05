CREATE OR REPLACE FUNCTION public.get_daily_vault_status(_user_id uuid)
RETURNS TABLE(
  vault_open boolean,
  daily_checklist_completed boolean,
  trades_taken_today integer,
  max_trades_allowed integer,
  discipline_score integer,
  vault_score integer,
  vault_level integer,
  required_actions_remaining integer,
  checklist_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_checklist RECORD;
  v_checklist_completed BOOLEAN := FALSE;
  v_vault_open BOOLEAN := FALSE;
  v_trades_today INTEGER := 0;
  v_max_trades INTEGER := 3;
  v_discipline_score INTEGER := 0;
  v_discipline_status TEXT := 'locked';
  v_vault_score_data RECORD;
  v_vault_level_data RECORD;
  v_vault_score INTEGER := 0;
  v_vault_level INTEGER := 1;
  v_actions_remaining INTEGER := 5;
  v_checklist_id UUID := NULL;
BEGIN
  -- Get today's checklist if exists
  SELECT * INTO v_checklist
  FROM vault_daily_checklist vdc
  WHERE vdc.user_id = _user_id AND vdc.date = v_today;

  IF v_checklist IS NOT NULL THEN
    v_checklist_id := v_checklist.id;
    v_checklist_completed := v_checklist.completed;

    -- Calculate remaining actions if not completed
    IF NOT v_checklist_completed THEN
      v_actions_remaining := 0;
      IF NOT v_checklist.plan_reviewed THEN v_actions_remaining := v_actions_remaining + 1; END IF;
      IF NOT v_checklist.risk_confirmed THEN v_actions_remaining := v_actions_remaining + 1; END IF;
    END IF;
  ELSE
    v_actions_remaining := 5; -- All items needed
  END IF;

  IF v_checklist_completed THEN
    v_actions_remaining := 0;
  END IF;

  -- Compute trades taken today
  SELECT COUNT(*) INTO v_trades_today
  FROM trade_entries te
  WHERE te.user_id = _user_id AND te.trade_date = v_today;

  -- Get max trades allowed from rules
  SELECT tr.max_trades_per_day INTO v_max_trades
  FROM trading_rules tr
  WHERE tr.user_id = _user_id;
  v_max_trades := COALESCE(v_max_trades, 3);

  -- Get discipline info directly from profile
  SELECT p.discipline_score, p.discipline_status
  INTO v_discipline_score, v_discipline_status
  FROM profiles p
  WHERE p.user_id = _user_id;

  v_discipline_score := COALESCE(v_discipline_score, 0);
  v_discipline_status := COALESCE(v_discipline_status, 'locked');

  -- Get vault score
  SELECT * INTO v_vault_score_data
  FROM calculate_vault_score(_user_id);

  IF v_vault_score_data IS NOT NULL THEN
    v_vault_score := COALESCE(v_vault_score_data.score, 0);
  END IF;

  -- Get vault level
  SELECT * INTO v_vault_level_data
  FROM calculate_vault_level(_user_id);

  IF v_vault_level_data IS NOT NULL THEN
    v_vault_level := COALESCE(v_vault_level_data.vault_level, 1);
  END IF;

  -- Vault opens only if:
  -- 1) Daily checklist is completed
  -- 2) Discipline status is not locked
  v_vault_open := v_checklist_completed AND v_discipline_status = 'active';

  RETURN QUERY SELECT
    v_vault_open,
    v_checklist_completed,
    v_trades_today,
    v_max_trades,
    v_discipline_score,
    v_vault_score,
    v_vault_level,
    v_actions_remaining,
    v_checklist_id;
END;
$function$;