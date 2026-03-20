
-- Create trader_dna table for AI-driven user profiles
CREATE TABLE public.trader_dna (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_style text NOT NULL DEFAULT 'day_trader',
  instruments text[] NOT NULL DEFAULT ARRAY['options']::text[],
  experience_level text NOT NULL DEFAULT 'beginner',
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  personality_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  insights_version integer NOT NULL DEFAULT 0,
  last_analyzed_at timestamptz,
  raw_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trader_dna ENABLE ROW LEVEL SECURITY;

-- Users can read their own DNA
CREATE POLICY "Users can read own trader_dna"
ON public.trader_dna FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own DNA
CREATE POLICY "Users can insert own trader_dna"
ON public.trader_dna FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own DNA
CREATE POLICY "Users can update own trader_dna"
ON public.trader_dna FOR UPDATE
USING (auth.uid() = user_id);

-- Service role needs access for edge function updates (handled by default)

-- Trigger for updated_at
CREATE TRIGGER update_trader_dna_updated_at
BEFORE UPDATE ON public.trader_dna
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
