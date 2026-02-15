-- Add academy experience level to profiles
ALTER TABLE public.profiles
ADD COLUMN academy_experience text NOT NULL DEFAULT 'newbie';