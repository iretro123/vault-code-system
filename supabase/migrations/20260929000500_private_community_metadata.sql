-- Reaction/pin rows reveal member identities and must follow the parent message.
-- Existing author/moderator policies still control writes (restrictive AND).
CREATE POLICY "Visible message required for reactions" ON public.message_reactions
AS RESTRICTIVE FOR ALL TO authenticated,anon
USING (EXISTS(SELECT 1 FROM public.academy_messages m WHERE m.id=message_id AND NOT coalesce(m.is_deleted,false)))
WITH CHECK (EXISTS(SELECT 1 FROM public.academy_messages m WHERE m.id=message_id AND NOT coalesce(m.is_deleted,false)));
CREATE POLICY "Visible message required for pins" ON public.pinned_messages
AS RESTRICTIVE FOR ALL TO authenticated,anon
USING (EXISTS(SELECT 1 FROM public.academy_messages m WHERE m.id=message_id AND NOT coalesce(m.is_deleted,false)))
WITH CHECK (EXISTS(SELECT 1 FROM public.academy_messages m WHERE m.id=message_id AND NOT coalesce(m.is_deleted,false)));
CREATE POLICY "Member room lock visibility" ON public.room_locks
AS RESTRICTIVE FOR SELECT TO authenticated,anon
USING (public.has_current_full_access() OR (public.can_use_free_community() AND room_slug IN ('trade-floor','wins-proof','questions','off-topic')));
CREATE POLICY "Unbanned members read calendar" ON public.calendar_posts
AS RESTRICTIVE FOR SELECT TO authenticated,anon
USING(public.can_use_free_community());
