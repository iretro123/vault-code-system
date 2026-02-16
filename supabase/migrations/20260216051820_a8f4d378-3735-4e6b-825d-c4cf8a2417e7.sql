
-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own messages" ON public.academy_messages;

-- Strict UPDATE policy: owner within 15 min OR operator
CREATE POLICY "Users can update own messages within 15 min or admin"
  ON public.academy_messages
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'operator'::app_role)
    OR (
      auth.uid() = user_id
      AND created_at > (now() - interval '15 minutes')
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'operator'::app_role)
    OR (
      auth.uid() = user_id
      AND created_at > (now() - interval '15 minutes')
    )
  );

-- Separate policy for soft-delete by owner anytime (only allows setting is_deleted)
-- We handle this by allowing UPDATE for own messages without time limit,
-- but the 15-min policy above already covers owner updates.
-- Since soft-delete is also an UPDATE, we need a second policy for delete-anytime:
DROP POLICY IF EXISTS "Users can update own messages within 15 min or admin" ON public.academy_messages;

-- Combined approach: operators can do anything, owners can always soft-delete, owners can edit within 15 min
-- We'll use a trigger to enforce the edit-vs-delete distinction server-side

CREATE POLICY "Message update policy"
  ON public.academy_messages
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'operator'::app_role)
    OR auth.uid() = user_id
  )
  WITH CHECK (
    has_role(auth.uid(), 'operator'::app_role)
    OR auth.uid() = user_id
  );

-- Trigger to enforce 15-min edit window for non-operators
CREATE OR REPLACE FUNCTION public.enforce_message_edit_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Operators can do anything
  IF has_role(auth.uid(), 'operator'::app_role) THEN
    RETURN NEW;
  END IF;

  -- If body is being changed (edit), enforce 15-min window
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    IF OLD.created_at < (now() - interval '15 minutes') THEN
      RAISE EXCEPTION 'Messages can only be edited within 15 minutes of posting';
    END IF;
  END IF;

  -- Prevent non-owners from any update (belt-and-suspenders with RLS)
  IF auth.uid() != OLD.user_id THEN
    RAISE EXCEPTION 'You can only modify your own messages';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_message_edit ON public.academy_messages;
CREATE TRIGGER trg_enforce_message_edit
  BEFORE UPDATE ON public.academy_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_edit_rules();
