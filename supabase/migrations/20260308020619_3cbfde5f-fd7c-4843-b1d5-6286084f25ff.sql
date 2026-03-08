CREATE OR REPLACE FUNCTION public.send_welcome_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config jsonb;
  first_name text;
  dm_title text;
  dm_body text;
  dm_link text;
  v_thread_id uuid;
  v_inbox_id uuid;
  v_operator_id uuid;
BEGIN
  SELECT value INTO config FROM public.system_settings WHERE key = 'welcome_dm';
  IF config IS NULL OR NOT COALESCE((config->>'enabled')::boolean, true) THEN
    RETURN NEW;
  END IF;

  -- Deduplicate
  IF EXISTS (SELECT 1 FROM public.inbox_items WHERE user_id = NEW.user_id AND type = 'reminder' AND title = COALESCE(config->>'title', 'Welcome to Vault OS')) THEN
    RETURN NEW;
  END IF;

  -- Get operator (sender)
  SELECT ur.user_id INTO v_operator_id FROM public.user_roles ur WHERE ur.role = 'operator' LIMIT 1;

  dm_title := COALESCE(config->>'title', 'Welcome to Vault OS');
  dm_body := COALESCE(config->>'body', 'Welcome!');
  dm_link := config->>'link';
  first_name := split_part(COALESCE(NULLIF(NEW.display_name, ''), 'there'), ' ', 1);
  dm_body := replace(dm_body, '{first_name}', first_name);

  -- Create DM thread
  INSERT INTO public.dm_threads (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_thread_id;

  IF v_thread_id IS NULL THEN
    SELECT id INTO v_thread_id FROM public.dm_threads WHERE user_id = NEW.user_id;
  END IF;

  -- Insert welcome as a real DM message
  IF v_thread_id IS NOT NULL AND v_operator_id IS NOT NULL THEN
    INSERT INTO public.dm_messages (thread_id, sender_id, body)
    VALUES (v_thread_id, v_operator_id, dm_body);
  END IF;

  -- Create inbox item with dm_thread_id linked
  INSERT INTO public.inbox_items (user_id, type, title, body, link, dm_thread_id)
  VALUES (NEW.user_id, 'reminder', dm_title, dm_body, dm_link, v_thread_id);

  RETURN NEW;
END;
$$;