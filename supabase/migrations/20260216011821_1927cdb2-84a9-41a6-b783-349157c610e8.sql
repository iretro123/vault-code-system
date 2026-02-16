
-- Add profile_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

-- Create coach_answer_reads table for tracking which replies user has read
CREATE TABLE IF NOT EXISTS public.coach_answer_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reply_id uuid NOT NULL REFERENCES public.coach_ticket_replies(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, reply_id)
);

ALTER TABLE public.coach_answer_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own answer reads"
  ON public.coach_answer_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answer reads"
  ON public.coach_answer_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own answer reads"
  ON public.coach_answer_reads FOR DELETE
  USING (auth.uid() = user_id);
