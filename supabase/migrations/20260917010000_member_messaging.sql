-- Member-to-member messaging is separate from the existing staff inbox.
-- Review and test on staging before deployment. No production migration is run by the UI.
CREATE TABLE public.member_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 member_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 updated_at timestamptz NOT NULL DEFAULT now(),
 last_message text,
 last_sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 read_a_at timestamptz,
 read_b_at timestamptz,
 CHECK (member_a < member_b), UNIQUE(member_a, member_b)
);
CREATE TABLE public.member_messages (
 id uuid PRIMARY KEY,
 conversation_id uuid NOT NULL REFERENCES public.member_conversations(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_messages_history ON public.member_messages(conversation_id, created_at DESC, id DESC);
CREATE TABLE public.member_message_blocks (
 blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 PRIMARY KEY(blocker_id, blocked_id), CHECK(blocker_id <> blocked_id)
);
ALTER TABLE public.member_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_message_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only participants read conversations" ON public.member_conversations FOR SELECT TO authenticated
 USING(auth.uid() IN (member_a, member_b));
CREATE POLICY "Only participants read member messages" ON public.member_messages FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.member_conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.member_a,c.member_b)));
CREATE POLICY "Read own message blocks" ON public.member_message_blocks FOR SELECT TO authenticated USING(blocker_id = auth.uid());
REVOKE ALL ON public.member_conversations, public.member_messages, public.member_message_blocks FROM anon, authenticated;
GRANT SELECT ON public.member_conversations, public.member_messages, public.member_message_blocks TO authenticated;

-- Only established account holders with a Vault role may discover or contact members.
CREATE FUNCTION public.member_messaging_eligible(uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.user_id JOIN auth.users u ON u.id=p.user_id
 WHERE p.user_id = uid AND (r.subscription_status = 'active' OR r.role::text IN ('free','operator','vault_os_owner'))
 AND lower(coalesce(u.email,'')) <> 'guest@vaulttradingacademy.com' AND coalesce(u.raw_user_meta_data->>'is_shared_guest','false') <> 'true'
 AND (r.subscription_expires_at IS NULL OR r.subscription_expires_at > now() OR r.role::text IN ('operator','vault_os_owner')));
$$;
CREATE FUNCTION public.search_message_members(term text) RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p.user_id, coalesce(nullif(p.display_name,''),'Vault member'), p.avatar_url FROM public.profiles p
 WHERE public.member_messaging_eligible(auth.uid()) AND public.member_messaging_eligible(p.user_id)
 AND p.user_id <> auth.uid() AND length(trim(term)) BETWEEN 2 AND 80
 AND (strpos(lower(coalesce(p.display_name,'')),lower(trim(term))) > 0 OR strpos(lower(coalesce(p.username,'')),lower(trim(term))) > 0)
 AND NOT EXISTS(SELECT 1 FROM public.member_message_blocks b WHERE (b.blocker_id=auth.uid() AND b.blocked_id=p.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=p.user_id))
 ORDER BY p.display_name LIMIT 20;
$$;
CREATE FUNCTION public.open_member_conversation(peer uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
 DECLARE result uuid;
 BEGIN
 IF auth.uid() IS NULL OR peer = auth.uid() OR NOT public.member_messaging_eligible(auth.uid()) OR NOT public.member_messaging_eligible(peer) THEN RAISE EXCEPTION 'Messaging unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.member_message_blocks WHERE (blocker_id=auth.uid() AND blocked_id=peer) OR (blocker_id=peer AND blocked_id=auth.uid())) THEN RAISE EXCEPTION 'Messaging unavailable'; END IF;
 INSERT INTO public.member_conversations(member_a,member_b) VALUES(least(auth.uid(),peer),greatest(auth.uid(),peer)) ON CONFLICT(member_a,member_b) DO NOTHING;
 SELECT id INTO result FROM public.member_conversations WHERE member_a=least(auth.uid(),peer) AND member_b=greatest(auth.uid(),peer);
 RETURN result;
 END;
$$;
CREATE FUNCTION public.send_member_message(conversation uuid, message_id uuid, message_body text) RETURNS public.member_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
 DECLARE c public.member_conversations; result public.member_messages; peer uuid;
 BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 SELECT * INTO c FROM public.member_conversations WHERE id=conversation AND auth.uid() IN(member_a,member_b) FOR UPDATE;
 IF c.id IS NULL OR NOT public.member_messaging_eligible(auth.uid()) THEN RAISE EXCEPTION 'Messaging unavailable'; END IF;
 peer := CASE WHEN c.member_a=auth.uid() THEN c.member_b ELSE c.member_a END;
 IF NOT public.member_messaging_eligible(peer) OR EXISTS(SELECT 1 FROM public.member_message_blocks WHERE (blocker_id=auth.uid() AND blocked_id=peer) OR (blocker_id=peer AND blocked_id=auth.uid())) THEN RAISE EXCEPTION 'Messaging unavailable'; END IF;
 SELECT * INTO result FROM public.member_messages WHERE id=message_id AND conversation_id=conversation AND sender_id=auth.uid();
 IF result.id IS NOT NULL THEN RETURN result; END IF;
 IF (SELECT count(*) FROM public.member_messages WHERE sender_id=auth.uid() AND created_at>now()-interval '1 minute') >= 30 THEN RAISE EXCEPTION 'Too many messages. Please wait a minute.'; END IF;
 INSERT INTO public.member_messages(id,conversation_id,sender_id,body) VALUES(message_id,conversation,auth.uid(),trim(message_body)) RETURNING * INTO result;
 UPDATE public.member_conversations SET updated_at=result.created_at,last_message=left(result.body,160),last_sender_id=auth.uid() WHERE id=conversation;
 RETURN result;
 END;
$$;
CREATE FUNCTION public.read_member_conversation(conversation uuid, through_time timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
 BEGIN
 UPDATE public.member_conversations SET
 read_a_at=CASE WHEN member_a=auth.uid() THEN greatest(read_a_at,least(through_time,now())) ELSE read_a_at END,
 read_b_at=CASE WHEN member_b=auth.uid() THEN greatest(read_b_at,least(through_time,now())) ELSE read_b_at END
 WHERE id=conversation AND auth.uid() IN(member_a,member_b);
 END;
$$;
REVOKE ALL ON FUNCTION public.read_member_conversation(uuid,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_member_conversation(uuid,timestamptz) TO authenticated;
CREATE FUNCTION public.set_member_message_block(peer uuid, blocked boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
 BEGIN
 IF auth.uid() IS NULL OR peer=auth.uid() THEN RAISE EXCEPTION 'Invalid member'; END IF;
 IF blocked THEN INSERT INTO public.member_message_blocks VALUES(auth.uid(),peer) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM public.member_message_blocks WHERE blocker_id=auth.uid() AND blocked_id=peer; END IF;
 END;
$$;
REVOKE ALL ON FUNCTION public.member_messaging_eligible(uuid), public.search_message_members(text), public.open_member_conversation(uuid), public.send_member_message(uuid,uuid,text), public.set_member_message_block(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_message_members(text), public.open_member_conversation(uuid), public.send_member_message(uuid,uuid,text), public.set_member_message_block(uuid,boolean) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_messages, public.member_conversations;
