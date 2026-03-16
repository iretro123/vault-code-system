
-- Trigger: auto-create inbox_item for operators when a new coach ticket is submitted
CREATE OR REPLACE FUNCTION public.inbox_on_new_coach_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _op RECORD;
  _sender_name TEXT;
BEGIN
  -- Get the submitter's display name
  SELECT display_name INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  -- Notify all operators
  FOR _op IN
    SELECT ur.user_id
    FROM public.academy_user_roles ur
    JOIN public.academy_roles r ON r.id = ur.role_id
    JOIN public.academy_role_permissions rp ON rp.role_id = r.id
    WHERE rp.permission_key = 'manage_users'
      AND ur.user_id != NEW.user_id
  LOOP
    INSERT INTO public.inbox_items (user_id, type, title, body, link, sender_id)
    VALUES (
      _op.user_id,
      'coach_reply',
      'New question from ' || COALESCE(_sender_name, 'a student'),
      LEFT(NEW.question, 150),
      '/academy/admin',
      NEW.user_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_new_coach_ticket
  AFTER INSERT ON public.coach_tickets
  FOR EACH ROW EXECUTE FUNCTION public.inbox_on_new_coach_ticket();
