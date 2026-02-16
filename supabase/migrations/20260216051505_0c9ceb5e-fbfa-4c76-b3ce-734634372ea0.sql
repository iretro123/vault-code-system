
-- Add edit/delete columns to academy_messages
ALTER TABLE public.academy_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_content text DEFAULT NULL;

-- Allow users to UPDATE their own messages (for editing)
CREATE POLICY "Users can update own messages"
  ON public.academy_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also allow operators to soft-delete any message
DROP POLICY IF EXISTS "Users can update own messages" ON public.academy_messages;

CREATE POLICY "Users can update own messages"
  ON public.academy_messages
  FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'operator'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'operator'::app_role));
