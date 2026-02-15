ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York';