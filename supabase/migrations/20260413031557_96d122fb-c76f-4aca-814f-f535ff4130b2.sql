
CREATE TABLE public.daily_checkin_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  prompt_key TEXT NOT NULL,
  response TEXT NOT NULL DEFAULT 'skipped',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkin_responses_user_date ON public.daily_checkin_responses (user_id, date);

ALTER TABLE public.daily_checkin_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own checkin responses"
ON public.daily_checkin_responses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkin responses"
ON public.daily_checkin_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkin responses"
ON public.daily_checkin_responses
FOR UPDATE
USING (auth.uid() = user_id);
