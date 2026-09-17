import {supabase} from '@/integrations/supabase/client';
export interface DirectoryMember {user_id:string;display_name:string;avatar_url:string|null;username?:string|null;is_rz?:boolean;activity_count?:number}
export function rankDirectoryMembers(profiles:DirectoryMember[],activity:{user_id:string}[],viewer:string,term='') {
 const counts=new Map<string,number>();activity.forEach(m=>counts.set(m.user_id,(counts.get(m.user_id)||0)+1));
 const q=term.trim().toLowerCase();
 return profiles.map(p=>({...p,is_rz:p.is_rz===true,activity_count:counts.get(p.user_id)||0}))
  .filter(p=>(p.user_id!==viewer||p.is_rz)&&(!q||`${p.display_name} ${p.username||''}`.toLowerCase().includes(q)))
  .sort((a,b)=>Number(b.is_rz)-Number(a.is_rz)||(b.activity_count||0)-(a.activity_count||0)||a.display_name.localeCompare(b.display_name));
}
// Preview reads only public community identities and message author IDs, never DM bodies.
// Ranking is based on the latest 500 visible posts within 30 days, not online presence.
export async function readCommunityDirectory(viewer:string,term=''):Promise<DirectoryMember[]> {
 const [{data:posts,error:postError},{data:roles,error:roleError}]=await Promise.all([
  supabase.from('academy_messages').select('user_id').eq('room_slug','trade-floor').is('parent_message_id',null).eq('is_deleted',false).gte('created_at',new Date(Date.now()-30*86400000).toISOString()).order('created_at',{ascending:false}).limit(500),
  supabase.from('academy_user_roles').select('user_id, academy_roles!inner(name)').eq('academy_roles.name','CEO'),
 ]);
 if(postError)throw postError;
 const ids=[...new Set([viewer,...(posts||[]).map(p=>p.user_id),...(!roleError?roles||[]:[]).map(r=>r.user_id)])];
 const {data,error}=await supabase.rpc('get_community_profiles',{_user_ids:ids},{get:true});
 if(error)throw error;
 const founders=new Set((!roleError?roles||[]:[]).map(r=>r.user_id));
 return rankDirectoryMembers((data||[]).map(p=>({user_id:p.user_id,display_name:p.display_name||p.username||'Vault member',username:p.username,avatar_url:p.avatar_url,is_rz:founders.has(p.user_id)&&p.display_name?.trim().toLowerCase()==='rz'})),posts||[],viewer,term);
}
