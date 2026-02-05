-- Add username and avatar_url columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add constraint for username format (lowercase, numbers, underscore only)
ALTER TABLE public.profiles 
ADD CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$');

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);