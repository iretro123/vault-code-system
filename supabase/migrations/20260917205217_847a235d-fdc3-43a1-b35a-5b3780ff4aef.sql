REVOKE EXECUTE ON FUNCTION
 public.member_messaging_eligible(uuid),
 public.search_message_members(text),
 public.open_member_conversation(uuid),
 public.send_member_message(uuid,uuid,text,jsonb),
 public.read_member_conversation(uuid,timestamptz),
 public.set_member_message_block(uuid,boolean),
 public.change_member_friendship(uuid,text),
 public.list_member_friends(),
 public.search_member_messages(uuid,text),
 public.member_file_access(text,boolean)
FROM anon;