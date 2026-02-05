
-- Create the vault daily checklist table
CREATE TABLE public.vault_daily_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mental_state INTEGER NOT NULL CHECK (mental_state >= 1 AND mental_state <= 5),
  sleep_quality INTEGER NOT NULL CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  emotional_control INTEGER NOT NULL CHECK (emotional_control >= 1 AND emotional_control <= 5),
  plan_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  risk_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.vault_daily_checklist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own daily checklists"
ON public.vault_daily_checklist
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily checklists"
ON public.vault_daily_checklist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily checklists"
ON public.vault_daily_checklist
FOR UPDATE
USING (auth.uid() = user_id);

-- Create the get_daily_vault_status function
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
  v_vault_status RECORD;
  v_vault_score_data RECORD;
  v_vault_level_data RECORD;
  v_checklist_completed BOOLEAN := FALSE;
  v_vault_open BOOLEAN := FALSE;
  v_trades_today INTEGER := 0;
  v_max_trades INTEGER := 3;
  v_discipline_score INTEGER := 0;
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
      -- Mental state, sleep, and emotional control are always filled when record exists
    END IF;
  ELSE
    v_actions_remaining := 5; -- All items needed
  END IF;
  
  IF v_checklist_completed THEN
    v_actions_remaining := 0;
  END IF;
  
  -- Get vault status from authority function
  SELECT * INTO v_vault_status
  FROM get_vault_status(_user_id);
  
  IF v_vault_status IS NOT NULL THEN
    v_trades_today := COALESCE(v_vault_status.trades_today, 0);
    v_max_trades := COALESCE(v_vault_status.max_trades_per_day, 3);
    v_discipline_score := COALESCE(v_vault_status.discipline_score, 0);
  END IF;
  
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
  -- 1. Daily checklist is completed
  -- 2. Discipline status is not locked (from authority)
  v_vault_open := v_checklist_completed AND 
                  v_vault_status IS NOT NULL AND 
                  v_vault_status.discipline_status = 'active';
  
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

-- Create function to complete daily checklist
CREATE OR REPLACE FUNCTION public.complete_daily_checklist(
  _user_id uuid,
  _mental_state integer,
  _sleep_quality integer,
  _emotional_control integer,
  _plan_reviewed boolean,
  _risk_confirmed boolean
)
RETURNS TABLE(
  success boolean,
  message text,
  checklist_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_checklist_id UUID;
  v_is_completed BOOLEAN := FALSE;
BEGIN
  -- Validate inputs
  IF _mental_state < 1 OR _mental_state > 5 THEN
    RETURN QUERY SELECT FALSE, 'Mental state must be between 1 and 5'::text, NULL::uuid;
    RETURN;
  END IF;
  
  IF _sleep_quality < 1 OR _sleep_quality > 5 THEN
    RETURN QUERY SELECT FALSE, 'Sleep quality must be between 1 and 5'::text, NULL::uuid;
    RETURN;
  END IF;
  
  IF _emotional_control < 1 OR _emotional_control > 5 THEN
    RETURN QUERY SELECT FALSE, 'Emotional control must be between 1 and 5'::text, NULL::uuid;
    RETURN;
  END IF;
  
  -- All items must be confirmed for completion
  v_is_completed := _plan_reviewed AND _risk_confirmed;
  
  -- Insert or update the checklist
  INSERT INTO vault_daily_checklist (
    user_id, date, mental_state, sleep_quality, emotional_control,
    plan_reviewed, risk_confirmed, completed
  )
  VALUES (
    _user_id, v_today, _mental_state, _sleep_quality, _emotional_control,
    _plan_reviewed, _risk_confirmed, v_is_completed
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    mental_state = EXCLUDED.mental_state,
    sleep_quality = EXCLUDED.sleep_quality,
    emotional_control = EXCLUDED.emotional_control,
    plan_reviewed = EXCLUDED.plan_reviewed,
    risk_confirmed = EXCLUDED.risk_confirmed,
    completed = EXCLUDED.completed
  RETURNING id INTO v_checklist_id;
  
  -- Log vault event if checklist completed
  IF v_is_completed THEN
    PERFORM log_vault_event(
      _user_id,
      'daily_ritual_completed',
      jsonb_build_object(
        'mental_state', _mental_state,
        'sleep_quality', _sleep_quality,
        'emotional_control', _emotional_control,
        'timestamp', now()
      )
    );
  END IF;
  
  IF v_is_completed THEN
    RETURN QUERY SELECT TRUE, 'Daily ritual completed. Vault is now open.'::text, v_checklist_id;
  ELSE
    RETURN QUERY SELECT FALSE, 'Please complete all checklist items.'::text, v_checklist_id;
  END IF;
END;
$function$;

-- Enable realtime for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_daily_checklist;
