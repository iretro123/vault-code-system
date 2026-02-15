
-- 1) onboarding_state
CREATE TABLE public.onboarding_state (
  user_id UUID NOT NULL PRIMARY KEY,
  role_level TEXT NOT NULL DEFAULT 'beginner',
  claimed_role BOOLEAN NOT NULL DEFAULT false,
  intro_posted BOOLEAN NOT NULL DEFAULT false,
  first_lesson_started BOOLEAN NOT NULL DEFAULT false,
  first_lesson_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding_state" ON public.onboarding_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding_state" ON public.onboarding_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding_state" ON public.onboarding_state FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_onboarding_state_updated_at
  BEFORE UPDATE ON public.onboarding_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) user_task
CREATE TABLE public.user_task (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'onboarding',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.user_task ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.user_task FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.user_task FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.user_task FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.user_task FOR DELETE USING (auth.uid() = user_id);

-- 3) notification_log
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notification_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notification_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notification_log FOR UPDATE USING (auth.uid() = user_id);

-- 4) post_signal
CREATE TABLE public.post_signal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  post_id UUID,
  signal_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_signal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post_signals" ON public.post_signal FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own post_signals" ON public.post_signal FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operators can view all post_signals" ON public.post_signal FOR SELECT USING (has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Operators can insert post_signals" ON public.post_signal FOR INSERT WITH CHECK (has_role(auth.uid(), 'operator'::app_role));
