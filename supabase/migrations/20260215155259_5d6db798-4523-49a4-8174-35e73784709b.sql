-- Live sessions table (admin-managed)
CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  session_date timestamptz NOT NULL,
  join_url text NOT NULL DEFAULT '',
  session_type text NOT NULL DEFAULT 'live',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live sessions" ON public.live_sessions
  FOR SELECT USING (true);
CREATE POLICY "Operators can insert live sessions" ON public.live_sessions
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Operators can update live sessions" ON public.live_sessions
  FOR UPDATE USING (has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Operators can delete live sessions" ON public.live_sessions
  FOR DELETE USING (has_role(auth.uid(), 'operator'::app_role));