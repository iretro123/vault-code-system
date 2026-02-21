
-- Toolkit items table
CREATE TABLE public.toolkit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'templates',
  file_url text,
  external_url text,
  icon text NOT NULL DEFAULT 'file',
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.toolkit_items ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read visible items
CREATE POLICY "Authenticated can read visible toolkit items"
  ON public.toolkit_items FOR SELECT
  USING (visible = true OR has_role(auth.uid(), 'operator'::app_role));

-- Operators can manage
CREATE POLICY "Operators can insert toolkit items"
  ON public.toolkit_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can update toolkit items"
  ON public.toolkit_items FOR UPDATE
  USING (has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can delete toolkit items"
  ON public.toolkit_items FOR DELETE
  USING (has_role(auth.uid(), 'operator'::app_role));

-- Storage bucket for toolkit files
INSERT INTO storage.buckets (id, name, public) VALUES ('toolkit-files', 'toolkit-files', true);

-- Storage policies
CREATE POLICY "Anyone authenticated can read toolkit files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'toolkit-files');

CREATE POLICY "Operators can upload toolkit files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'toolkit-files' AND has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can delete toolkit files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'toolkit-files' AND has_role(auth.uid(), 'operator'::app_role));
