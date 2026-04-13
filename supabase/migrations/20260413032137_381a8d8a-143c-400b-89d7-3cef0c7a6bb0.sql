DROP POLICY IF EXISTS "Users can delete own checkin responses" ON public.daily_checkin_responses;
CREATE POLICY "Users can delete own checkin responses"
ON public.daily_checkin_responses
FOR DELETE
USING (auth.uid() = user_id);