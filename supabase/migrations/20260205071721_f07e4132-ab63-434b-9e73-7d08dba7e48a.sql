
-- Create the vault level calculation function
CREATE OR REPLACE FUNCTION public.calculate_vault_level(_user_id uuid)
RETURNS TABLE(
  vault_level integer,
  vault_xp numeric,
  xp_to_next_level numeric,
  progress_percent numeric,
  level_title text,
  level_rank text,
  next_level_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_xp NUMERIC := 0;
  v_xp_gains NUMERIC := 0;
  v_xp_penalties NUMERIC := 0;
  
  -- XP gain counts
  v_compliant_trades INTEGER := 0;
  v_full_compliant_days INTEGER := 0;
  v_checklist_completions INTEGER := 0;
  v_three_day_streaks INTEGER := 0;
  v_seven_day_streaks INTEGER := 0;
  v_discipline_recoveries INTEGER := 0;
  
  -- XP penalty counts
  v_violations INTEGER := 0;
  v_trades_blocked INTEGER := 0;
  v_discipline_locks INTEGER := 0;
  
  -- Level calculation
  v_level INTEGER := 1;
  v_xp_for_current_level NUMERIC := 0;
  v_xp_for_next_level NUMERIC := 100;
  v_xp_in_current_level NUMERIC := 0;
  v_progress NUMERIC := 0;
  v_title TEXT := 'Novice I';
  v_rank TEXT := 'Novice';
  v_next_title TEXT := 'Novice II';
  
  -- Level thresholds (cumulative XP required)
  v_level_thresholds INTEGER[] := ARRAY[
    0,      -- Level 1
    100,    -- Level 2
    250,    -- Level 3
    450,    -- Level 4
    700,    -- Level 5
    1000,   -- Level 6
    1400,   -- Level 7
    1900,   -- Level 8
    2500,   -- Level 9
    3200,   -- Level 10
    4000,   -- Level 11
    5000,   -- Level 12
    6200,   -- Level 13
    7600,   -- Level 14
    9200,   -- Level 15
    11000,  -- Level 16
    13000,  -- Level 17
    15500,  -- Level 18
    18500,  -- Level 19
    22000,  -- Level 20
    26000,  -- Level 21
    30500,  -- Level 22
    35500,  -- Level 23
    41000,  -- Level 24
    47000,  -- Level 25
    54000,  -- Level 26
    62000,  -- Level 27
    71000,  -- Level 28
    81000,  -- Level 29
    92000   -- Level 30
  ];
BEGIN
  -- ============================================
  -- CALCULATE XP GAINS
  -- ============================================
  
  -- Count compliant trades (+5 XP each)
  SELECT COUNT(*) INTO v_compliant_trades
  FROM trade_entries te
  WHERE te.user_id = _user_id AND te.followed_rules = TRUE;
  
  -- Count full compliant days (+10 XP each) - days with trades where ALL trades were compliant
  SELECT COUNT(*) INTO v_full_compliant_days
  FROM (
    SELECT te.trade_date
    FROM trade_entries te
    WHERE te.user_id = _user_id
    GROUP BY te.trade_date
    HAVING BOOL_AND(te.followed_rules) = TRUE
  ) compliant_days;
  
  -- Count checklist completions (+2 XP each)
  SELECT COUNT(*) INTO v_checklist_completions
  FROM pre_trade_checks ptc
  WHERE ptc.user_id = _user_id AND ptc.is_cleared = TRUE;
  
  -- Count 3-day streaks achieved (+15 XP per occurrence)
  -- Look for streak milestone events
  SELECT COUNT(*) INTO v_three_day_streaks
  FROM vault_events ve
  WHERE ve.user_id = _user_id 
    AND ve.event_type = 'streak_milestone'
    AND (ve.event_context->>'streak_days')::integer = 3;
  
  -- Also calculate from current streak data
  WITH streak_calc AS (
    SELECT te.trade_date, BOOL_AND(te.followed_rules) as all_compliant
    FROM trade_entries te
    WHERE te.user_id = _user_id
    GROUP BY te.trade_date
    ORDER BY te.trade_date
  ),
  streak_groups AS (
    SELECT 
      trade_date,
      all_compliant,
      trade_date - (ROW_NUMBER() OVER (ORDER BY trade_date))::integer AS streak_group
    FROM streak_calc
    WHERE all_compliant = TRUE
  ),
  streaks AS (
    SELECT 
      streak_group,
      COUNT(*) as streak_length
    FROM streak_groups
    GROUP BY streak_group
  )
  SELECT COALESCE(SUM(FLOOR(streak_length / 3)), 0) INTO v_three_day_streaks
  FROM streaks;
  
  -- Count 7-day streaks achieved (+25 XP per occurrence)
  WITH streak_calc AS (
    SELECT te.trade_date, BOOL_AND(te.followed_rules) as all_compliant
    FROM trade_entries te
    WHERE te.user_id = _user_id
    GROUP BY te.trade_date
    ORDER BY te.trade_date
  ),
  streak_groups AS (
    SELECT 
      trade_date,
      all_compliant,
      trade_date - (ROW_NUMBER() OVER (ORDER BY trade_date))::integer AS streak_group
    FROM streak_calc
    WHERE all_compliant = TRUE
  ),
  streaks AS (
    SELECT 
      streak_group,
      COUNT(*) as streak_length
    FROM streak_groups
    GROUP BY streak_group
  )
  SELECT COALESCE(SUM(FLOOR(streak_length / 7)), 0) INTO v_seven_day_streaks
  FROM streaks;
  
  -- Count discipline recoveries (+50 XP each)
  SELECT COUNT(*) INTO v_discipline_recoveries
  FROM vault_events ve
  WHERE ve.user_id = _user_id 
    AND ve.event_type = 'discipline_recovered';
  
  -- ============================================
  -- CALCULATE XP PENALTIES
  -- ============================================
  
  -- Count violations (-10 XP each)
  SELECT COUNT(*) INTO v_violations
  FROM trade_entries te
  WHERE te.user_id = _user_id AND te.followed_rules = FALSE;
  
  -- Count trades blocked (-15 XP each)
  SELECT COUNT(*) INTO v_trades_blocked
  FROM vault_events ve
  WHERE ve.user_id = _user_id 
    AND ve.event_type = 'trade_blocked';
  
  -- Count discipline locks (-25 XP each)
  SELECT COUNT(*) INTO v_discipline_locks
  FROM vault_events ve
  WHERE ve.user_id = _user_id 
    AND ve.event_type = 'discipline_locked';
  
  -- ============================================
  -- CALCULATE TOTAL XP
  -- ============================================
  
  v_xp_gains := 
    (v_compliant_trades * 5) +
    (v_full_compliant_days * 10) +
    (v_checklist_completions * 2) +
    (v_three_day_streaks * 15) +
    (v_seven_day_streaks * 25) +
    (v_discipline_recoveries * 50);
  
  v_xp_penalties := 
    (v_violations * 10) +
    (v_trades_blocked * 15) +
    (v_discipline_locks * 25);
  
  v_total_xp := GREATEST(0, v_xp_gains - v_xp_penalties);
  
  -- ============================================
  -- CALCULATE LEVEL
  -- ============================================
  
  v_level := 1;
  FOR i IN 1..30 LOOP
    IF v_total_xp >= v_level_thresholds[i] THEN
      v_level := i;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  -- Get XP thresholds for current and next level
  v_xp_for_current_level := v_level_thresholds[v_level];
  IF v_level < 30 THEN
    v_xp_for_next_level := v_level_thresholds[v_level + 1];
  ELSE
    v_xp_for_next_level := v_level_thresholds[30] + 10000; -- Max level
  END IF;
  
  -- Calculate progress to next level
  v_xp_in_current_level := v_total_xp - v_xp_for_current_level;
  v_progress := ROUND((v_xp_in_current_level / (v_xp_for_next_level - v_xp_for_current_level)) * 100, 1);
  v_progress := LEAST(100, GREATEST(0, v_progress));
  
  -- ============================================
  -- DETERMINE RANK AND TITLE
  -- ============================================
  
  -- Determine rank based on level
  IF v_level <= 5 THEN
    v_rank := 'Novice';
  ELSIF v_level <= 10 THEN
    v_rank := 'Developing';
  ELSIF v_level <= 20 THEN
    v_rank := 'Consistent';
  ELSE
    v_rank := 'Elite';
  END IF;
  
  -- Determine level title
  v_title := v_rank || ' ' || 
    CASE 
      WHEN v_level <= 5 THEN v_level::text
      WHEN v_level <= 10 THEN (v_level - 5)::text
      WHEN v_level <= 20 THEN (v_level - 10)::text
      ELSE (v_level - 20)::text
    END;
  
  -- Determine next level title
  IF v_level >= 30 THEN
    v_next_title := 'Maximum Level';
  ELSE
    DECLARE
      v_next_level INTEGER := v_level + 1;
      v_next_rank TEXT;
    BEGIN
      IF v_next_level <= 5 THEN
        v_next_rank := 'Novice';
      ELSIF v_next_level <= 10 THEN
        v_next_rank := 'Developing';
      ELSIF v_next_level <= 20 THEN
        v_next_rank := 'Consistent';
      ELSE
        v_next_rank := 'Elite';
      END IF;
      
      v_next_title := v_next_rank || ' ' || 
        CASE 
          WHEN v_next_level <= 5 THEN v_next_level::text
          WHEN v_next_level <= 10 THEN (v_next_level - 5)::text
          WHEN v_next_level <= 20 THEN (v_next_level - 10)::text
          ELSE (v_next_level - 20)::text
        END;
    END;
  END IF;
  
  RETURN QUERY SELECT 
    v_level,
    v_total_xp,
    v_xp_for_next_level - v_total_xp,
    v_progress,
    v_title,
    v_rank,
    v_next_title;
END;
$function$;
