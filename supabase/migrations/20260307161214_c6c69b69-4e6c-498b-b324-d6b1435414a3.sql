
-- 1) Create system_settings table
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'operator'::app_role)
    OR has_academy_permission(auth.uid(), 'manage_notifications'::text)
  )
  WITH CHECK (
    has_role(auth.uid(), 'operator'::app_role)
    OR has_academy_permission(auth.uid(), 'manage_notifications'::text)
  );

-- 2) Seed with default welcome DM
INSERT INTO public.system_settings (key, value) VALUES (
  'welcome_dm',
  '{"enabled":true,"title":"Welcome to Vault OS","body":"Hey {first_name} — welcome in.\n\nQuick check:\n• Are you new to trading? (Yes/No)\n• What motivated you to join?\n\nStart here (2 minutes): Complete your Gameplan Foundation → Set your Starting Balance → Log your first trade (or mark a No-Trade Day).","link":"/academy/home"}'::jsonb
);

-- 3) Update trigger function to read from system_settings dynamically
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
BEGIN
  -- Read config from system_settings
  SELECT value INTO config FROM public.system_settings WHERE key = 'welcome_dm';

  -- If no config or disabled, skip
  IF config IS NULL OR NOT COALESCE((config->>'enabled')::boolean, true) THEN
    RETURN NEW;
  END IF;

  dm_title := COALESCE(config->>'title', 'Welcome to Vault OS');
  dm_body := COALESCE(config->>'body', 'Welcome!');
  dm_link := config->>'link';

  -- Deduplicate
  IF NOT EXISTS (
    SELECT 1 FROM public.inbox_items
    WHERE user_id = NEW.user_id
      AND type = 'reminder'
      AND title = dm_title
  ) THEN
    first_name := split_part(COALESCE(NULLIF(NEW.display_name, ''), 'there'), ' ', 1);
    dm_body := replace(dm_body, '{first_name}', first_name);

    INSERT INTO public.inbox_items (user_id, type, title, body, link)
    VALUES (NEW.user_id, 'reminder', dm_title, dm_body, dm_link);
  END IF;

  RETURN NEW;
END;
$$;
