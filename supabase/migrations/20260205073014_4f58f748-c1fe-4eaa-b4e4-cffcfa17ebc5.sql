
-- Create function to get vault identity with rank system
CREATE OR REPLACE FUNCTION public.get_vault_identity(_user_id uuid)
RETURNS TABLE(
  vault_score integer,
  vault_level integer,
  vault_rank text,
  vault_title text,
  next_rank text,
  progress_percent numeric,
  rank_color text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vault_score integer;
  v_vault_level integer;
  v_vault_rank text;
  v_vault_title text;
  v_next_rank text;
  v_progress_percent numeric;
  v_rank_color text;
  v_score_result record;
  v_level_result record;
BEGIN
  -- Get vault score from calculate_vault_score
  SELECT * INTO v_score_result
  FROM calculate_vault_score(_user_id);
  
  IF v_score_result IS NULL THEN
    v_vault_score := 0;
  ELSE
    v_vault_score := COALESCE(v_score_result.score, 0);
  END IF;
  
  -- Get vault level from calculate_vault_level
  SELECT * INTO v_level_result
  FROM calculate_vault_level(_user_id);
  
  IF v_level_result IS NULL THEN
    v_vault_level := 1;
  ELSE
    v_vault_level := COALESCE(v_level_result.vault_level, 1);
  END IF;
  
  -- Determine rank, title, next rank, and color based on score
  CASE
    WHEN v_vault_score >= 0 AND v_vault_score <= 19 THEN
      v_vault_rank := 'LOCKED';
      v_vault_title := 'Undisciplined';
      v_next_rank := 'NOVICE';
      v_rank_color := 'destructive';
      v_progress_percent := (v_vault_score::numeric / 20) * 100;
      
    WHEN v_vault_score >= 20 AND v_vault_score <= 39 THEN
      v_vault_rank := 'NOVICE';
      v_vault_title := 'Unproven';
      v_next_rank := 'DEVELOPING';
      v_rank_color := 'warning';
      v_progress_percent := ((v_vault_score - 20)::numeric / 20) * 100;
      
    WHEN v_vault_score >= 40 AND v_vault_score <= 59 THEN
      v_vault_rank := 'DEVELOPING';
      v_vault_title := 'Emerging';
      v_next_rank := 'STRONG';
      v_rank_color := 'muted';
      v_progress_percent := ((v_vault_score - 40)::numeric / 20) * 100;
      
    WHEN v_vault_score >= 60 AND v_vault_score <= 79 THEN
      v_vault_rank := 'STRONG';
      v_vault_title := 'Proven';
      v_next_rank := 'ELITE';
      v_rank_color := 'primary';
      v_progress_percent := ((v_vault_score - 60)::numeric / 20) * 100;
      
    WHEN v_vault_score >= 80 AND v_vault_score <= 100 THEN
      v_vault_rank := 'ELITE';
      v_vault_title := 'Master';
      v_next_rank := 'MAX RANK';
      v_rank_color := 'accent';
      v_progress_percent := ((v_vault_score - 80)::numeric / 20) * 100;
      
    ELSE
      v_vault_rank := 'LOCKED';
      v_vault_title := 'Undisciplined';
      v_next_rank := 'NOVICE';
      v_rank_color := 'destructive';
      v_progress_percent := 0;
  END CASE;
  
  -- Cap progress at 100
  v_progress_percent := LEAST(v_progress_percent, 100);
  
  RETURN QUERY SELECT
    v_vault_score,
    v_vault_level,
    v_vault_rank,
    v_vault_title,
    v_next_rank,
    v_progress_percent,
    v_rank_color;
END;
$$;
