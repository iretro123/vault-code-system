CREATE INDEX IF NOT EXISTS idx_inbox_items_user_pinned_created ON public.inbox_items (user_id, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions (message_id);

DROP POLICY IF EXISTS "Membership boundary for community" ON public.academy_messages;
CREATE POLICY "Membership boundary for community" ON public.academy_messages
AS RESTRICTIVE FOR ALL TO anon, authenticated
USING ((select public.has_current_full_access()) OR ((select public.can_use_free_community()) AND room_slug = ANY (ARRAY['trade-floor','wins-proof','questions','off-topic'])))
WITH CHECK ((select public.has_current_full_access()) OR ((select public.can_use_free_community()) AND room_slug = ANY (ARRAY['trade-floor','wins-proof','questions','off-topic'])));