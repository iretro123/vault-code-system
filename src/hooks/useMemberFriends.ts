import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {supabase} from '@/integrations/supabase/client';
import {isLocalDesignPreview} from '@/integrations/supabase/localPreviewFetch';
import type {Member} from './useMemberMessages';
const db=supabase as SupabaseClient;
export interface MemberFriend extends Member{accepted:boolean;incoming:boolean}
export function useMemberFriends(userId:string|undefined){
 const [friends,setFriends]=useState<MemberFriend[]>([]),[error,setError]=useState('');
 const preview=isLocalDesignPreview();
 useEffect(()=>{
  setFriends([]);setError('');if(!userId||preview)return;
  let active=true;
  async function refresh(){if(document.hidden)return;const {data,error:err}=await db.rpc('list_member_friends');if(active){if(err)setError('Friends could not load.');else{setFriends(data||[]);setError('');}}}
  void refresh();const channel=db.channel(`member-friends:${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'member_friendships'},()=>void refresh()).subscribe();
  const timer=setInterval(refresh,20000);return()=>{active=false;clearInterval(timer);void db.removeChannel(channel);};
 },[userId,preview]);
 async function change(member:Member,action:'request'|'accept'|'remove'){
  if(!preview){const {error:err}=await db.rpc('change_member_friendship',{peer:member.user_id,action});if(err)throw err;}
  setFriends(prev=>action==='remove'?prev.filter(f=>f.user_id!==member.user_id):action==='accept'?prev.map(f=>f.user_id===member.user_id?{...f,accepted:true}:f):prev.some(f=>f.user_id===member.user_id)?prev:[...prev,{...member,accepted:false,incoming:false}]);
 }
 return{friends,error,change};
}
