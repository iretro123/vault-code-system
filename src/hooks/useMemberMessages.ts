import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isLocalDesignPreview } from '@/integrations/supabase/localPreviewFetch';
import type {MemberAttachment} from '@/lib/memberAttachments';
import {readCommunityDirectory,type DirectoryMember} from '@/lib/memberDirectory';

// Separate adapter until generated database types include the reviewed migration.
const db = supabase as SupabaseClient;
export type Member = DirectoryMember;
export interface Conversation { id: string; member_a: string; member_b: string; updated_at: string; last_message?: string; last_sender_id?: string; read_a_at?: string; read_b_at?: string }
export interface MemberMessage { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; status?: 'sending' | 'failed'; attachments?:MemberAttachment[] }
export function mergeMemberMessages(current: MemberMessage[], incoming: MemberMessage[]) {
  const rows = new Map(current.map(m => [m.id, m]));
  incoming.forEach(m => rows.set(m.id, m));
  return [...rows.values()].sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
export const sampleMembers: Member[] = [
  { user_id: 'demo-avery', display_name: 'Avery · Demo', avatar_url: null },
  { user_id: 'demo-jordan', display_name: 'Jordan · Demo', avatar_url: null },
  { user_id: 'demo-sam', display_name: 'Sam · Demo', avatar_url: null },
];
export function useMemberMessages(userId: string | undefined, conversationId: string | null) {
  const preview = isLocalDesignPreview();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string,Member>>({});
  const [messages, setMessages] = useState<MemberMessage[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [connected, setConnected] = useState(false);
  const current = useRef(conversationId); current.current = conversationId;
  const account = useRef(userId); account.current = userId;
  const demo = useRef<Record<string,MemberMessage[]>>({});
  const nearBottom = useRef(true);
  const readThrough = useRef<Record<string,string>>({});
  const outbox = useRef<MemberMessage[]>([]);
  const previewUrls = useRef(new Set<string>());
  const directory=useRef<{time:number;rows:Member[]}|null>(null);
  useEffect(()=>()=>{previewUrls.current.forEach(url=>URL.revokeObjectURL?.(url));previewUrls.current.clear();},[userId]);
  const saveOutbox = (rows:MemberMessage[]) => {
    outbox.current=rows;
    try{sessionStorage.setItem(`vault-member-outbox:${userId}`,JSON.stringify(rows));}catch{/* Optional storage. */}
  };

  const refresh = useCallback(async () => {
    if (!userId || preview) return;
    try {
      const { data, error: err } = await db.from('member_conversations').select('*').order('updated_at',{ascending:false}).limit(100);
      if (err) throw err;
      if(account.current!==userId) return;
      const rows = (data || []) as Conversation[];
      const ids = rows.map(c => c.member_a===userId ? c.member_b : c.member_a);
      const [{data:p},{data:b}] = await Promise.all([
        ids.length ? supabase.rpc('get_community_profiles',{_user_ids:ids},{get:true}) : Promise.resolve({data:[]}),
        db.from('member_message_blocks').select('blocked_id').eq('blocker_id',userId),
      ]);
      if(account.current!==userId) return;
      setConversations(rows); setBlocked((b || []).map(row => row.blocked_id));
      setProfiles(Object.fromEntries((p || []).map(row => [row.user_id,{ user_id:row.user_id, display_name:row.display_name || 'Vault member', avatar_url:row.avatar_url }])));
      setError('');
    } catch { if(account.current===userId) setError('Messages could not connect. Retry in a moment. The member-messaging database update must be installed before this works live.'); }
    finally { if(account.current===userId) setLoading(false); }
  },[userId,preview]);

  useEffect(() => {
    setMessages([]); setProfiles({}); setConversations([]); setBlocked([]); setLoading(true); demo.current={}; readThrough.current={};
    outbox.current=[];
    directory.current=null;
    try{const saved=JSON.parse(sessionStorage.getItem(`vault-member-outbox:${userId}`)||'[]');if(Array.isArray(saved))outbox.current=saved.filter(m=>m.sender_id===userId&&typeof m.id==='string'&&typeof m.body==='string'&&typeof m.created_at==='string').map(m=>({...m,status:'failed'}));}catch{/* Ignore corrupt local drafts. */}
    if(!userId) { setLoading(false); return; }
    if(preview) {
      setProfiles(Object.fromEntries(sampleMembers.map(p=>[p.user_id,p])));
      const id='demo-conversation';
      setConversations([{id,member_a:userId,member_b:sampleMembers[0].user_id,updated_at:new Date().toISOString(),last_message:'Want to compare notes after Wednesday’s class?',last_sender_id:sampleMembers[0].user_id}]);
      demo.current[id]=[{id:'demo-intro',conversation_id:id,sender_id:sampleMembers[0].user_id,body:'Want to compare notes after Wednesday’s class?',created_at:new Date(Date.now()-300000).toISOString()}];
      setLoading(false); setConnected(true); return;
    }
    void refresh();
    const catchUp=()=>{if(!document.hidden)void refresh();};
    const channel=db.channel(`member-inbox:${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'member_conversations'},catchUp).subscribe(status=>{if(status==='SUBSCRIBED')catchUp();});
    const timer=window.setInterval(catchUp,30000);window.addEventListener('online',catchUp);document.addEventListener('visibilitychange',catchUp);
    return ()=>{void db.removeChannel(channel);window.clearInterval(timer);window.removeEventListener('online',catchUp);document.removeEventListener('visibilitychange',catchUp);};
  },[userId,preview,refresh]);

  useEffect(() => {
    setMessages(outbox.current.filter(m=>m.conversation_id===conversationId)); setHasOlder(false); setHistoryLoading(!!conversationId); nearBottom.current=true; setConnected(preview);
    if(!conversationId || !userId) return;
    if(preview) { setMessages(demo.current[conversationId] || []); setHistoryLoading(false); return; }
    let alive=true; let busy=false; let lastSync:MemberMessage|undefined;
    const catchUp=async()=>{
      if(busy || document.hidden) return; busy=true;
      try {
        let more=true;
        while(alive && more) {
          let query=db.from('member_messages').select('*').eq('conversation_id',conversationId);
          const incremental=!!lastSync;
          if(lastSync) query=query.or(`created_at.gt.${lastSync.created_at},and(created_at.eq.${lastSync.created_at},id.gt.${lastSync.id})`);
          const {data,error:err}=await query.order('created_at',{ascending:incremental}).order('id',{ascending:incremental}).limit(50);
          if(err) throw err;
          const rows=(data||[]) as MemberMessage[];
          if(alive) {
            if(rows.length) setMessages(prev=>mergeMemberMessages(prev,rows));
            if(!incremental) setHasOlder(rows.length===50);
            setError('');
          }
          if(rows.length) lastSync=incremental?rows[rows.length-1]:rows[0];
          more=incremental&&rows.length===50;
        }
      } catch { if(alive) setError('Could not refresh this conversation. Your draft is safe.'); }
      finally { busy=false; if(alive) setHistoryLoading(false); }
    };
    const channel=db.channel(`member-chat:${conversationId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'member_messages',filter:`conversation_id=eq.${conversationId}`},payload=>{
      if(alive) setMessages(prev=>mergeMemberMessages(prev,[payload.new as MemberMessage]));
    }).subscribe(status=>{if(alive) {setConnected(status==='SUBSCRIBED'); if(status==='SUBSCRIBED') void catchUp();}});
    void catchUp();
    const timer=window.setInterval(catchUp,15000);
    window.addEventListener('online',catchUp); document.addEventListener('visibilitychange',catchUp);
    return ()=>{alive=false;window.clearInterval(timer); window.removeEventListener('online',catchUp);document.removeEventListener('visibilitychange',catchUp);void db.removeChannel(channel);};
  },[conversationId,userId,preview]);

  async function search(term:string):Promise<Member[]> {
    if(!userId)return [];
    if(preview){
      if(!directory.current||Date.now()-directory.current.time>60000)directory.current={time:Date.now(),rows:await readCommunityDirectory(userId)};
      const q=term.trim().toLowerCase();return directory.current.rows.filter(p=>!blocked.includes(p.user_id)&&(!q||`${p.display_name} ${p.username||''}`.toLowerCase().includes(q)));
    }
    const {data,error:err}=await db.rpc('discover_message_members',{term:term.trim()});
    if(err) throw err; return (data||[]) as Member[];
  }
  async function open(peer:Member) {
    if(!userId) return null;
    let id:string;
    if(preview) {
      id=conversations.find(c=>c.member_a===peer.user_id || c.member_b===peer.user_id)?.id || crypto.randomUUID();
      setConversations(prev=>prev.some(c=>c.id===id)?prev:[{id,member_a:userId,member_b:peer.user_id,updated_at:new Date().toISOString()},...prev]);
    } else {
      const {data,error:err}=await db.rpc('open_member_conversation',{peer:peer.user_id});
      if(err) throw err; id=data as string; await refresh();
    }
    setProfiles(prev=>({...prev,[peer.user_id]:peer})); return id;
  }
  async function openMember(peerId:string) {
    if(!/^[0-9a-f-]{36}$/i.test(peerId) || peerId===userId) throw new Error('Invalid member');
    const {data,error:err}=await supabase.rpc('get_community_profiles',{_user_ids:[peerId]},{get:true});
    if(err || !data?.[0]) throw new Error('Member unavailable');
    const p=data[0];
    return open({user_id:peerId,display_name:`${p.display_name || 'Vault member'}${preview?' · Preview':''}`,avatar_url:p.avatar_url});
  }
  async function send(body:string, retry?:MemberMessage, attachments:MemberAttachment[]=[]) {
    if(!userId || !conversationId || (!body.trim()&&!attachments.length&&!retry?.attachments?.length) || body.trim().length>4000) return false;
    const message:MemberMessage=retry ? {...retry,status:'sending'} : {id:crypto.randomUUID(),conversation_id:conversationId,sender_id:userId,body:body.trim(),attachments,created_at:new Date().toISOString(),status:'sending'};
    const target=conversationId;
    if(preview)message.attachments?.forEach(a=>{if(a.url?.startsWith('blob:'))previewUrls.current.add(a.url);});
    saveOutbox(mergeMemberMessages(outbox.current,[message]));
    setMessages(prev=>mergeMemberMessages(prev,[message])); nearBottom.current=true;
    try {
      let saved:MemberMessage={...message,status:undefined};
      if(preview) demo.current[target]=mergeMemberMessages(demo.current[target]||[],[saved]);
      else {
        const {data,error:err}=await db.rpc('send_member_message',{conversation:target,message_id:message.id,message_body:message.body,message_attachments:message.attachments||[]});
        if(err) throw err; saved=data as MemberMessage;
      }
      if(account.current!==userId) return false;
      saveOutbox(outbox.current.filter(m=>m.id!==message.id));
      if(current.current===target) setMessages(prev=>mergeMemberMessages(prev,[saved]));
      setConversations(prev=>prev.map(c=>c.id===target?{...c,updated_at:saved.created_at,last_message:saved.body||'Attachment',last_sender_id:userId}:c).sort((a,b)=>b.updated_at.localeCompare(a.updated_at)));
      return true;
    } catch {
      if(account.current===userId) saveOutbox(mergeMemberMessages(outbox.current,[{...message,status:'failed'}]));
      if(account.current===userId && current.current===target) setMessages(prev=>mergeMemberMessages(prev,[{...message,status:'failed'}]));
      return false;
    }
  }
  async function loadOlder() {
    const first=messages.find(m=>!m.status); if(!first || historyLoading || preview) return;
    const target=conversationId; setHistoryLoading(true);
    try {
      const {data,error:err}=await db.from('member_messages').select('*').eq('conversation_id',target).or(`created_at.lt.${first.created_at},and(created_at.eq.${first.created_at},id.lt.${first.id})`).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50);
      if(err) throw err;
      if(current.current===target) {setMessages(prev=>mergeMemberMessages(prev,(data||[]) as MemberMessage[]));setHasOlder((data||[]).length===50);}
    } catch {setError('Could not load earlier messages. Please retry.');}
    finally {if(current.current===target) setHistoryLoading(false);}
  }
  async function toggleBlock(peer:string) {
    const value=!blocked.includes(peer);
    if(!preview) {const {error:err}=await db.rpc('set_member_message_block',{peer,blocked:value}); if(err) throw err;}
    setBlocked(prev=>value?[...prev,peer]:prev.filter(id=>id!==peer));
  }
  async function markRead() {
    const latest=messages.filter(m=>!m.status).at(-1);
    if(!latest || !conversationId || latest.conversation_id!==conversationId || !userId || document.hidden || readThrough.current[conversationId]===latest.created_at) return;
    const target=conversationId; readThrough.current[target]=latest.created_at;
    if(!preview) {const {error:err}=await db.rpc('read_member_conversation',{conversation:target,through_time:latest.created_at});if(err){delete readThrough.current[target];return;}}
    if(account.current===userId) setConversations(prev=>prev.map(c=>c.id===target?{...c,[c.member_a===userId?'read_a_at':'read_b_at']:latest.created_at}:c));
  }
  return {preview,conversations,profiles,messages,blocked,error,loading,historyLoading,hasOlder,connected,nearBottom,search,open,openMember,send,loadOlder,toggleBlock,refresh,markRead};
}
