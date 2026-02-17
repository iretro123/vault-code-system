
-- Create user_preferences table for notification & trading settings
CREATE TABLE public.user_preferences (
  user_id uuid NOT NULL PRIMARY KEY,
  trading_style text DEFAULT NULL,
  default_market text NOT NULL DEFAULT 'options',
  session_autopause_minutes integer NOT NULL DEFAULT 60,
  notifications_enabled boolean NOT NULL DEFAULT true,
  notify_announcements boolean NOT NULL DEFAULT true,
  notify_new_modules boolean NOT NULL DEFAULT true,
  notify_coach_reply boolean NOT NULL DEFAULT true,
  notify_live_events boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
