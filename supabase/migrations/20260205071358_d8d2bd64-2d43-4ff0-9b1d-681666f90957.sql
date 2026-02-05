
-- Create the vault recovery plan function
CREATE OR REPLACE FUNCTION public.get_vault_recovery_plan(_user_id uuid)
RETURNS TABLE(
  is_locked boolean,
  lock_reason text,
  recovery_tasks_required integer,
  recovery_tasks_completed integer,
  recovery_progress_percent numeric,
  next_required_action text,
  estimated_unlock_time text,
  tasks jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status RECORD;
  v_is_locked BOOLEAN := FALSE;
  v_lock_reason TEXT := '';
  v_tasks_required INTEGER := 0;
  v_tasks_completed INTEGER := 0;
  v_progress NUMERIC := 0;
  v_next_action TEXT := '';
  v_unlock_time TEXT := '';
  v_tasks JSONB := '[]'::jsonb;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_today DATE := CURRENT_DATE;
  v_tomorrow TIMESTAMP WITH TIME ZONE;
  v_hours_until_reset INTEGER;
  v_minutes_until_reset INTEGER;
  v_has_reflection BOOLEAN := FALSE;
  v_has_reviewed_violations BOOLEAN := FALSE;
  v_has_completed_checklist BOOLEAN := FALSE;
  v_is_new_day BOOLEAN := FALSE;
  v_last_violation_date DATE := NULL;
  v_last_reflection_date DATE := NULL;
  v_last_checklist_date DATE := NULL;
BEGIN
  -- Get vault status
  SELECT * INTO v_status FROM get_vault_status(_user_id);
  
  IF v_status IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Unable to retrieve vault status'::text,
      0::integer,
      0::integer,
      0::numeric,
      'Contact support'::text,
      'Unknown'::text,
      '[]'::jsonb;
    RETURN;
  END IF;

  -- Check if locked
  v_is_locked := (v_status.discipline_status = 'locked');
  v_lock_reason := v_status.reason;

  IF NOT v_is_locked THEN
    RETURN QUERY SELECT 
      FALSE::boolean,
      'Not locked'::text,
      0::integer,
      0::integer,
      100::numeric,
      'Continue trading with discipline'::text,
      'N/A'::text,
      '[]'::jsonb;
    RETURN;
  END IF;

  -- Calculate time until midnight reset
  v_tomorrow := (v_today + INTERVAL '1 day')::timestamp with time zone;
  v_hours_until_reset := EXTRACT(EPOCH FROM (v_tomorrow - v_now)) / 3600;
  v_minutes_until_reset := (EXTRACT(EPOCH FROM (v_tomorrow - v_now)) / 60)::integer % 60;
  v_unlock_time := v_hours_until_reset || 'h ' || v_minutes_until_reset || 'm until daily reset';

  -- Check for last violation date
  SELECT MAX(te.trade_date) INTO v_last_violation_date
  FROM trade_entries te
  WHERE te.user_id = _user_id AND te.followed_rules = FALSE;

  -- Check if it's a new day since last violation (task 1: wait for new day)
  v_is_new_day := (v_last_violation_date IS NULL OR v_last_violation_date < v_today);

  -- Check for reflection entry today (look for vault event with type 'reflection_logged')
  SELECT EXISTS (
    SELECT 1 FROM vault_events ve
    WHERE ve.user_id = _user_id 
      AND ve.event_type = 'reflection_logged'
      AND ve.created_at::date = v_today
  ) INTO v_has_reflection;

  -- Check for violation review today (look for vault event with type 'violations_reviewed')
  SELECT EXISTS (
    SELECT 1 FROM vault_events ve
    WHERE ve.user_id = _user_id 
      AND ve.event_type = 'violations_reviewed'
      AND ve.created_at::date = v_today
  ) INTO v_has_reviewed_violations;

  -- Check for completed pre-trade checklist today
  SELECT EXISTS (
    SELECT 1 FROM pre_trade_checks ptc
    WHERE ptc.user_id = _user_id 
      AND ptc.is_cleared = TRUE
      AND ptc.created_at::date = v_today
  ) INTO v_has_completed_checklist;

  -- Build tasks array
  v_tasks_required := 4;
  v_tasks_completed := 0;

  -- Task 1: Wait for new trading day
  IF v_is_new_day THEN
    v_tasks_completed := v_tasks_completed + 1;
  END IF;
  v_tasks := v_tasks || jsonb_build_object(
    'id', 'wait_new_day',
    'title', 'Wait for new trading day',
    'description', 'Allow time to pass and reset your mindset',
    'completed', v_is_new_day,
    'order', 1
  );

  -- Task 2: Review violations
  IF v_has_reviewed_violations THEN
    v_tasks_completed := v_tasks_completed + 1;
  END IF;
  v_tasks := v_tasks || jsonb_build_object(
    'id', 'review_violations',
    'title', 'Review your violations',
    'description', 'Acknowledge what went wrong and why',
    'completed', v_has_reviewed_violations,
    'order', 2
  );

  -- Task 3: Log reflection entry
  IF v_has_reflection THEN
    v_tasks_completed := v_tasks_completed + 1;
  END IF;
  v_tasks := v_tasks || jsonb_build_object(
    'id', 'log_reflection',
    'title', 'Log a reflection entry',
    'description', 'Write about what you learned and how you will improve',
    'completed', v_has_reflection,
    'order', 3
  );

  -- Task 4: Complete pre-trade checklist
  IF v_has_completed_checklist THEN
    v_tasks_completed := v_tasks_completed + 1;
  END IF;
  v_tasks := v_tasks || jsonb_build_object(
    'id', 'complete_checklist',
    'title', 'Complete a pre-trade checklist',
    'description', 'Prove readiness with a cleared pre-trade check',
    'completed', v_has_completed_checklist,
    'order', 4
  );

  -- Calculate progress
  v_progress := ROUND((v_tasks_completed::numeric / v_tasks_required) * 100, 0);

  -- Determine next required action
  IF NOT v_is_new_day THEN
    v_next_action := 'Wait for the daily reset at midnight to begin recovery';
  ELSIF NOT v_has_reviewed_violations THEN
    v_next_action := 'Review your recent violations to understand what went wrong';
  ELSIF NOT v_has_reflection THEN
    v_next_action := 'Log a reflection entry about your trading mistakes';
  ELSIF NOT v_has_completed_checklist THEN
    v_next_action := 'Complete a pre-trade checklist to prove discipline readiness';
  ELSE
    v_next_action := 'All recovery tasks complete. Vault will unlock on next evaluation.';
    v_unlock_time := 'Imminent - refresh status';
  END IF;

  RETURN QUERY SELECT 
    v_is_locked,
    v_lock_reason,
    v_tasks_required,
    v_tasks_completed,
    v_progress,
    v_next_action,
    v_unlock_time,
    v_tasks;
END;
$function$;
