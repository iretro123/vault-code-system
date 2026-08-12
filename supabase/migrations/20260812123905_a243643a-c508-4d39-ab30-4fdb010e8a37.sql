CREATE TABLE public.daily_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  brief_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, brief_date)
);

GRANT SELECT ON public.daily_briefs TO authenticated;
GRANT ALL ON public.daily_briefs TO service_role;

ALTER TABLE public.daily_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily brief"
ON public.daily_briefs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX daily_briefs_user_date_idx ON public.daily_briefs (user_id, brief_date DESC);