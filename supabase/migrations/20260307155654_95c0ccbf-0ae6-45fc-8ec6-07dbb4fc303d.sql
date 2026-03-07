-- Fix inbox_items INSERT policy: allow operator OR manage_notifications OR self
DROP POLICY IF EXISTS "Operators or self can insert inbox items" ON public.inbox_items;

CREATE POLICY "Operators or admins can insert inbox items"
  ON public.inbox_items FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'operator'::app_role)
    OR has_academy_permission(auth.uid(), 'manage_notifications'::text)
    OR (user_id = auth.uid())
  );

-- Welcome message trigger (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.send_welcome_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inbox_items
    WHERE user_id = NEW.user_id
      AND type = 'reminder'
      AND title = 'Welcome to Vault OS'
  ) THEN
    INSERT INTO public.inbox_items (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'reminder',
      'Welcome to Vault OS',
      'Start here (2 minutes): 1) Complete your Gameplan Foundation 2) Set your Starting Balance 3) Log your first trade (or mark a No-Trade Day).',
      '/academy/home'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_welcome_inbox
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.send_welcome_inbox();