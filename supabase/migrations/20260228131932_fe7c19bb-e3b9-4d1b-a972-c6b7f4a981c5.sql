CREATE POLICY "Users can delete own inbox items"
ON public.inbox_items
FOR DELETE
USING (auth.uid() = user_id);