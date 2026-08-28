CREATE OR REPLACE FUNCTION public.enforce_message_edit_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow internal counter-only updates (reply_count maintained by triggers)
  IF NEW.reply_count IS DISTINCT FROM OLD.reply_count
     AND NEW.body IS NOT DISTINCT FROM OLD.body
     AND NEW.is_deleted IS NOT DISTINCT FROM OLD.is_deleted
     AND NEW.attachments IS NOT DISTINCT FROM OLD.attachments
     AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
    RETURN NEW;
  END IF;

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