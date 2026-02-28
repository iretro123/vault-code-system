
-- Tighten admin_override_access RPC: min 8 char reason, include target email in audit log
CREATE OR REPLACE FUNCTION public.admin_override_access(
  target_student_id uuid,
  new_status text,
  reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  before_rec record;
  student_email text;
  result jsonb;
  now_ts timestamptz := now();
BEGIN
  -- Validate caller is operator or vault_os_owner
  IF NOT (has_role(caller_id, 'operator') OR has_role(caller_id, 'vault_os_owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: requires operator or vault_os_owner role');
  END IF;

  -- Validate new_status (strict allowlist)
  IF new_status NOT IN ('active', 'past_due', 'canceled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status: must be active, past_due, or canceled');
  END IF;

  -- Validate reason (min 8 chars)
  IF reason IS NULL OR length(trim(reason)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required (minimum 8 characters)');
  END IF;

  -- Get student email for audit
  SELECT email INTO student_email FROM students WHERE id = target_student_id;
  IF student_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student not found');
  END IF;

  -- Get before state
  SELECT status, tier, product_key, access_granted_at, access_ended_at
  INTO before_rec
  FROM student_access
  WHERE user_id = target_student_id
  ORDER BY updated_at DESC
  LIMIT 1;

  -- If no existing access row, insert one
  IF NOT FOUND THEN
    INSERT INTO student_access (user_id, product_key, tier, status, access_granted_at, last_synced_at, updated_at)
    VALUES (target_student_id, 'vault_academy', 'elite_v1', new_status,
            CASE WHEN new_status = 'active' THEN now_ts ELSE now_ts END,
            now_ts, now_ts);
    
    before_rec := ROW(NULL, NULL, NULL, NULL, NULL);
  ELSE
    -- Update existing access
    UPDATE student_access
    SET status = new_status,
        access_granted_at = CASE WHEN new_status = 'active' THEN now_ts ELSE access_granted_at END,
        access_ended_at = CASE WHEN new_status = 'canceled' THEN now_ts ELSE NULL END,
        last_synced_at = now_ts,
        updated_at = now_ts
    WHERE user_id = target_student_id;
  END IF;

  -- Build result
  result := jsonb_build_object(
    'success', true,
    'before_status', before_rec.status,
    'after_status', new_status
  );

  -- Insert audit log with full context
  INSERT INTO audit_logs (admin_id, target_user_id, action, metadata)
  VALUES (
    caller_id,
    target_student_id,
    'manual_access_override',
    jsonb_build_object(
      'action_type', CASE 
        WHEN new_status = 'active' THEN 'manual_grant'
        WHEN new_status = 'past_due' THEN 'manual_mark_past_due'
        WHEN new_status = 'canceled' THEN 'manual_revoke'
      END,
      'before_state', jsonb_build_object(
        'status', before_rec.status,
        'tier', before_rec.tier,
        'product_key', before_rec.product_key
      ),
      'after_state', jsonb_build_object(
        'status', new_status,
        'tier', COALESCE(before_rec.tier, 'elite_v1'),
        'product_key', COALESCE(before_rec.product_key, 'vault_academy')
      ),
      'reason', trim(reason),
      'target_email', student_email,
      'actor_user_id', caller_id
    )
  );

  RETURN result;
END;
$$;
