CREATE TABLE public.member_friendships (
 member_a uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 member_b uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 requested_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 accepted boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(member_a,member_b), CHECK(member_a<member_b), CHECK(requested_by IN(member_a,member_b))
);
ALTER TABLE public.member_friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only friendship participants" ON public.member_friendships FOR SELECT TO authenticated USING(auth.uid() IN(member_a,member_b));
REVOKE ALL ON public.member_friendships FROM anon,authenticated;
GRANT SELECT ON public.member_friendships TO authenticated;
GRANT ALL ON public.member_friendships TO service_role;
CREATE FUNCTION public.change_member_friendship(peer uuid, action text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 DECLARE a uuid:=least(auth.uid(),peer); b uuid:=greatest(auth.uid(),peer);
 BEGIN
 IF auth.uid() IS NULL OR peer=auth.uid() OR NOT public.member_messaging_eligible(auth.uid()) OR NOT public.member_messaging_eligible(peer) THEN RAISE EXCEPTION 'Member unavailable'; END IF;
 IF action='remove' THEN DELETE FROM public.member_friendships WHERE member_a=a AND member_b=b; RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.member_message_blocks WHERE (blocker_id=auth.uid() AND blocked_id=peer) OR (blocker_id=peer AND blocked_id=auth.uid())) THEN RAISE EXCEPTION 'Member unavailable'; END IF;
 IF action='request' THEN
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 IF (SELECT count(*) FROM public.member_friendships WHERE requested_by=auth.uid() AND created_at>now()-interval '1 day')>=30 THEN RAISE EXCEPTION 'Please wait before adding more friends'; END IF;
 INSERT INTO public.member_friendships(member_a,member_b,requested_by) VALUES(a,b,auth.uid()) ON CONFLICT DO NOTHING;
 ELSIF action='accept' THEN UPDATE public.member_friendships SET accepted=true WHERE member_a=a AND member_b=b AND requested_by<>auth.uid();
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
 END;
$$;
CREATE FUNCTION public.list_member_friends() RETURNS TABLE(user_id uuid,display_name text,avatar_url text,accepted boolean,incoming boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.user_id,coalesce(p.display_name,'Vault member'),p.avatar_url,f.accepted,f.requested_by<>auth.uid()
 FROM public.member_friendships f JOIN public.profiles p ON p.user_id=CASE WHEN f.member_a=auth.uid() THEN f.member_b ELSE f.member_a END
 WHERE auth.uid() IN(f.member_a,f.member_b) AND public.member_messaging_eligible(auth.uid())
 ORDER BY f.accepted, f.created_at DESC LIMIT 200;
$$;
CREATE FUNCTION public.search_member_messages(conversation uuid,term text) RETURNS SETOF public.member_messages
 LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT m.* FROM public.member_messages m WHERE m.conversation_id=conversation AND length(trim(term)) BETWEEN 2 AND 100
 AND strpos(lower(m.body),lower(trim(term)))>0 ORDER BY m.created_at DESC,m.id DESC LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.change_member_friendship(uuid,text),public.list_member_friends(),public.search_member_messages(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_member_friendship(uuid,text),public.list_member_friends(),public.search_member_messages(uuid,text) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_friendships;

CREATE FUNCTION public.member_file_access(object_name text,writing boolean) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_conversations c WHERE c.id::text=split_part(object_name,'/',1)
 AND auth.uid() IN(c.member_a,c.member_b)
 AND (NOT writing OR (split_part(object_name,'/',2)=auth.uid()::text AND public.member_messaging_eligible(auth.uid())
 AND NOT EXISTS(SELECT 1 FROM public.member_message_blocks b WHERE (b.blocker_id=c.member_a AND b.blocked_id=c.member_b) OR (b.blocker_id=c.member_b AND b.blocked_id=c.member_a)))));
$$;
REVOKE ALL ON FUNCTION public.member_file_access(text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_file_access(text,boolean) TO authenticated;
CREATE POLICY "DM file readers" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='vault-member-files' AND public.member_file_access(name,false));
CREATE POLICY "DM file uploaders" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='vault-member-files' AND public.member_file_access(name,true));
CREATE POLICY "DM private read fence" ON storage.objects AS RESTRICTIVE FOR SELECT TO public USING(bucket_id<>'vault-member-files' OR (auth.uid() IS NOT NULL AND public.member_file_access(name,false)));
CREATE POLICY "DM private insert fence" ON storage.objects AS RESTRICTIVE FOR INSERT TO public WITH CHECK(bucket_id<>'vault-member-files' OR (auth.uid() IS NOT NULL AND public.member_file_access(name,true)));
CREATE POLICY "DM immutable files" ON storage.objects AS RESTRICTIVE FOR UPDATE TO public USING(bucket_id<>'vault-member-files') WITH CHECK(bucket_id<>'vault-member-files');
CREATE POLICY "DM deletion fence" ON storage.objects AS RESTRICTIVE FOR DELETE TO public USING(bucket_id<>'vault-member-files');

ALTER TABLE public.member_messages ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.member_messages DROP CONSTRAINT member_messages_body_check;
ALTER TABLE public.member_messages ADD CHECK(length(body)<=4000 AND (length(trim(body))>0 OR jsonb_array_length(attachments)>0));
DROP FUNCTION public.send_member_message(uuid,uuid,text);
CREATE FUNCTION public.send_member_message(conversation uuid,message_id uuid,message_body text,message_attachments jsonb DEFAULT '[]'::jsonb) RETURNS public.member_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
 DECLARE c public.member_conversations; result public.member_messages; peer uuid; attachment jsonb;
 BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 SELECT * INTO c FROM public.member_conversations WHERE id=conversation AND auth.uid() IN(member_a,member_b) FOR UPDATE;
 IF c.id IS NULL OR NOT public.member_messaging_eligible(auth.uid()) THEN RAISE EXCEPTION 'Messaging unavailable'; END IF;
 peer:=CASE WHEN c.member_a=auth.uid() THEN c.member_b ELSE c.member_a END;
 IF NOT public.member_messaging_eligible(peer) OR EXISTS(SELECT 1 FROM public.member_message_blocks WHERE (blocker_id=auth.uid() AND blocked_id=peer) OR (blocker_id=peer AND blocked_id=auth.uid())) THEN RAISE EXCEPTION 'Messaging unavailable'; END IF;
 SELECT * INTO result FROM public.member_messages WHERE id=message_id AND conversation_id=conversation AND sender_id=auth.uid();
 IF result.id IS NOT NULL THEN RETURN result; END IF;
 IF jsonb_typeof(message_attachments)<>'array' OR jsonb_array_length(message_attachments)>4 OR message_attachments IS NULL THEN RAISE EXCEPTION 'Invalid attachments'; END IF;
 FOR attachment IN SELECT value FROM jsonb_array_elements(message_attachments) LOOP
 IF attachment->>'type'='gif' THEN
 IF coalesce(attachment->>'url','') !~ '^https://([a-z0-9-]+\.)?giphy\.com/[^[:space:]]+$' OR length(attachment->>'url')>2048 THEN RAISE EXCEPTION 'Invalid GIF'; END IF;
 ELSE
 IF coalesce(attachment->>'type','') NOT IN('image','file') OR split_part(coalesce(attachment->>'path',''),'/',1)<>conversation::text OR split_part(attachment->>'path','/',2)<>auth.uid()::text
 OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='vault-member-files' AND o.name=attachment->>'path') THEN RAISE EXCEPTION 'Invalid file'; END IF;
 END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.member_messages WHERE sender_id=auth.uid() AND created_at>now()-interval '1 minute')>=30 THEN RAISE EXCEPTION 'Too many messages. Please wait a minute.'; END IF;
 INSERT INTO public.member_messages(id,conversation_id,sender_id,body,attachments) VALUES(message_id,conversation,auth.uid(),trim(message_body),message_attachments) RETURNING * INTO result;
 UPDATE public.member_conversations SET updated_at=result.created_at,last_message=left(coalesce(nullif(trim(message_body),''),'Attachment'),160),last_sender_id=auth.uid() WHERE id=conversation;
 RETURN result;
 END;
$$;
REVOKE ALL ON FUNCTION public.send_member_message(uuid,uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_member_message(uuid,uuid,text,jsonb) TO authenticated;