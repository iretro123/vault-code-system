
DROP POLICY IF EXISTS "Authenticated users can insert inbox items" ON public.inbox_items;

CREATE POLICY "Operators or self can insert inbox items"
  ON public.inbox_items FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'operator'::app_role)
    OR (user_id = auth.uid())
  );
