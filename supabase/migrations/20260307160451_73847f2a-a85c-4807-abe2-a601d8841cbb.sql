CREATE OR REPLACE FUNCTION public.send_welcome_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inbox_items
    WHERE user_id = NEW.user_id
      AND type = 'reminder'
      AND title = 'Welcome to Vault OS'
  ) THEN
    first_name := split_part(COALESCE(NULLIF(NEW.display_name, ''), 'there'), ' ', 1);
    INSERT INTO public.inbox_items (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'reminder',
      'Welcome to Vault OS',
      'Hey ' || first_name || E' — welcome in.\n\nQuick check:\n• Are you new to trading? (Yes/No)\n• What motivated you to join?\n\nStart here (2 minutes): Complete your Gameplan Foundation → Set your Starting Balance → Log your first trade (or mark a No-Trade Day).',
      '/academy/home'
    );
  END IF;
  RETURN NEW;
END;
$$;