
-- Add DELETE policies for vault reset functionality
CREATE POLICY "Users can delete own trade intents"
ON public.trade_intents
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault events"
ON public.vault_events
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault daily checklists"
ON public.vault_daily_checklist
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault focus sessions"
ON public.vault_focus_sessions
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault state"
ON public.vault_state
FOR DELETE
USING (auth.uid() = user_id);
