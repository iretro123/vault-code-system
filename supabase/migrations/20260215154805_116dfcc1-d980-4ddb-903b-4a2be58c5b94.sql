-- Add onboarding checklist fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_level text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS intro_posted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_lesson_started boolean NOT NULL DEFAULT false;

-- Backfill role_level from academy_experience for existing users who already set it
UPDATE public.profiles
SET role_level = academy_experience
WHERE academy_experience != 'newbie' AND role_level = '';