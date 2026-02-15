CREATE TABLE public.instant_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instant_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own answers" ON public.instant_answers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers" ON public.instant_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);