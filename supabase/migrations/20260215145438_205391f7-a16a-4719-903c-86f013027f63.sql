-- Academy messages table
CREATE TABLE public.academy_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_slug text NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT 'Anonymous',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast room queries
CREATE INDEX idx_academy_messages_room_created ON public.academy_messages (room_slug, created_at DESC);
CREATE INDEX idx_academy_messages_user_created ON public.academy_messages (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.academy_messages ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read all messages
CREATE POLICY "Authenticated users can read messages"
  ON public.academy_messages FOR SELECT
  TO authenticated
  USING (true);

-- Insert: authenticated users can insert their own messages, but NOT into announcements (unless operator)
CREATE POLICY "Users can send messages to non-readonly rooms"
  ON public.academy_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      room_slug != 'announcements'
      OR public.has_role(auth.uid(), 'operator')
    )
  );

-- Delete own messages
CREATE POLICY "Users can delete own messages"
  ON public.academy_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Rate limit: validation trigger (max 1 message per 3 seconds)
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.academy_messages
    WHERE user_id = NEW.user_id
      AND created_at > now() - interval '3 seconds'
  ) THEN
    RAISE EXCEPTION 'Rate limit: please wait 3 seconds between messages';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_message_rate_limit
  BEFORE INSERT ON public.academy_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_rate_limit();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.academy_messages;