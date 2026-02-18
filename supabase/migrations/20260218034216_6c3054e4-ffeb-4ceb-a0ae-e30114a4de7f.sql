
-- Create dedicated announcements table
CREATE TABLE public.academy_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  image_url text,
  delivery_mode text NOT NULL DEFAULT 'in_app',
  -- 'in_app' | 'in_app_notify' | 'in_app_notify_ping'
  segment text NOT NULL DEFAULT 'all',
  -- 'all' | 'beginner' | 'intermediate' | 'advanced' | 'paid'
  is_pinned boolean NOT NULL DEFAULT false,
  replies_locked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_announcements ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read announcements (segment filtering done app-side)
CREATE POLICY "Authenticated can read announcements"
  ON public.academy_announcements
  FOR SELECT
  TO authenticated
  USING (true);

-- Only users with manage_notifications permission can insert
CREATE POLICY "Admins can insert announcements"
  ON public.academy_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (has_academy_permission(auth.uid(), 'manage_notifications'));

-- Only users with manage_notifications permission can update
CREATE POLICY "Admins can update announcements"
  ON public.academy_announcements
  FOR UPDATE
  TO authenticated
  USING (has_academy_permission(auth.uid(), 'manage_notifications'));

-- Only users with manage_notifications permission can delete
CREATE POLICY "Admins can delete announcements"
  ON public.academy_announcements
  FOR DELETE
  TO authenticated
  USING (has_academy_permission(auth.uid(), 'manage_notifications'));

-- Index for fast listing
CREATE INDEX idx_announcements_created ON public.academy_announcements(created_at DESC);
CREATE INDEX idx_announcements_pinned ON public.academy_announcements(is_pinned DESC, created_at DESC);
