-- Coach requests table
CREATE TABLE public.coach_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_requests_user ON public.coach_requests (user_id, created_at DESC);
CREATE INDEX idx_coach_requests_status ON public.coach_requests (status, created_at DESC);

ALTER TABLE public.coach_requests ENABLE ROW LEVEL SECURITY;

-- Users can read own requests
CREATE POLICY "Users can view own requests"
  ON public.coach_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'operator')
  );

-- Users can insert own requests
CREATE POLICY "Users can create requests"
  ON public.coach_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only operators can update (mark resolved)
CREATE POLICY "Operators can update requests"
  ON public.coach_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'operator'));