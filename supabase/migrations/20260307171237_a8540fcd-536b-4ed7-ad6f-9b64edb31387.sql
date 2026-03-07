
-- 1. Trigger function: when an operator sends a DM, create an inbox_items notification for the user
CREATE OR REPLACE FUNCTION public.notify_user_on_operator_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_user_id uuid;
  v_sender_name text;
  v_is_operator boolean;
BEGIN
  -- Check if sender is an operator
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.sender_id AND role = 'operator'
  ) INTO v_is_operator;

  IF NOT v_is_operator THEN
    RETURN NEW;
  END IF;

  -- Get the thread's user_id (the member, not the operator)
  SELECT user_id INTO v_thread_user_id
  FROM public.dm_threads
  WHERE id = NEW.thread_id;

  -- Don't notify if sender IS the thread user
  IF v_thread_user_id IS NULL OR v_thread_user_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  -- Get sender display name
  SELECT COALESCE(display_name, 'Vault Academy') INTO v_sender_name
  FROM public.profiles
  WHERE user_id = NEW.sender_id
  LIMIT 1;

  -- Insert inbox notification for the user
  INSERT INTO public.inbox_items (user_id, type, title, body, sender_id, pinned)
  VALUES (
    v_thread_user_id,
    'coach_reply',
    'New message from ' || v_sender_name,
    LEFT(NEW.body, 120),
    NEW.sender_id,
    false
  );

  RETURN NEW;
END;
$$;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trg_notify_user_on_operator_dm ON public.dm_messages;
CREATE TRIGGER trg_notify_user_on_operator_dm
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_on_operator_dm();

-- 3. Enable realtime on inbox_items and dm_threads
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_threads;
