-- Coach tickets (replaces simple coach_requests for ticket workflow)
CREATE TABLE public.coach_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  urgency text NOT NULL DEFAULT 'standard',
  question text NOT NULL,
  screenshot_url text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tickets" ON public.coach_tickets
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Users can insert own tickets" ON public.coach_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operators can update tickets" ON public.coach_tickets
  FOR UPDATE USING (has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Users can update own tickets" ON public.coach_tickets
  FOR UPDATE USING (auth.uid() = user_id);

-- Ticket replies
CREATE TABLE public.coach_ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.coach_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT 'Coach',
  body text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_ticket_replies ENABLE ROW LEVEL SECURITY;

-- Users see replies on their own tickets; admins see all
CREATE POLICY "Users can read replies on own tickets" ON public.coach_ticket_replies
  FOR SELECT USING (
    has_role(auth.uid(), 'operator'::app_role)
    OR EXISTS (SELECT 1 FROM public.coach_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );
CREATE POLICY "Operators can insert replies" ON public.coach_ticket_replies
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Users can reply to own tickets" ON public.coach_ticket_replies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.coach_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

-- Storage bucket for ticket screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-screenshots', 'ticket-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload screenshots" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ticket-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'ticket-screenshots');