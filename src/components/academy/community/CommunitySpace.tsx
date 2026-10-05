import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Users, UserRound, ArrowUpRight, Plus, Trash2, Bell, Play, LockKeyhole } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { dailyVideos, defaultSpace, validateSpace, type SpaceSettings } from '@/lib/communitySpace';
import { enableWebPush } from '@/lib/webPush';
import { isNativePushPlatform, requestPushPermission } from '@/lib/pushPermission';
import { UserProfileCard } from './UserProfileCard';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import './community-space.css';

type Member = { user_id: string; display_name: string; avatar_url: string | null };
type Community = {total: number; online: Member[]};
// New RPCs return private settings and a deliberately limited public member summary.
const rpc = (name: string, args?: Record<string, unknown>) => supabase.rpc(name as never, args as never);
export function CommunitySpace() {
 const {user} = useAuth();
 const location=useLocation();
 const userId=user?.id;
 const [params,setParams] = useSearchParams();
 const tab = params.get('space') === 'mine' ? 'mine' : 'community';
 const [community,setCommunity]=useState<Community|null>(null);
 const [settings,setSettings]=useState<SpaceSettings>(defaultSpace);
 const [ready,setReady]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('');
 const [draft,setDraft]=useState('');
 const [member,setMember]=useState<string|null>(null);
 const memberTriggers=useRef(new Map<string,HTMLButtonElement>());
 const [videos,setVideos]=useState(()=>dailyVideos());
 useEffect(()=>{
  let alive=true;
  setReady(false); setError(''); setSettings(defaultSpace()); setCommunity(null);
  if(!userId) return;
  void rpc('my_space_get').then(({data,error})=>{if(!alive)return;if(error){setError('My space could not load. Try reloading.');return;} setSettings(data ? {...defaultSpace(),...(data as unknown as SpaceSettings), morning: (data as unknown as SpaceSettings).morning.slice(0,5), afternoon: (data as unknown as SpaceSettings).afternoon.slice(0,5)} : defaultSpace());setReady(true);});
  const refresh=()=>{setVideos(dailyVideos());void rpc('community_sidebar_summary').then(({data,error})=>{if(alive&&!error)setCommunity(data as unknown as Community);});};
  refresh();const timer=setInterval(refresh,60000);
  return()=>{alive=false;clearInterval(timer);};
 },[userId]);
  useEffect(()=>{setMember(null);},[location.pathname,location.search]);
 const update=(patch:Partial<SpaceSettings>)=>{setSettings(s=>({...s,...patch}));setStatus('');};
 const save=async()=>{
  const invalid=validateSpace(settings);if(invalid){setError(invalid);return;}
  setSaving(true);setError('');
  const {error}=await rpc('my_space_save',{settings});
  setSaving(false);if(error){setError('Could not save. Your changes are still here—try again.');return;}setStatus('Saved');
 };
 const enableDevice=async()=>{try{const ok=isNativePushPlatform()?await requestPushPermission()==='granted':await enableWebPush();setStatus(ok?'Device notifications enabled':'Use notification settings to enable this device. In-app reminders remain available.');}catch{setError('Device notifications could not connect. Try again in Settings.');}};
 return <aside className="vault-space" aria-label="Community and My space">
  <header><span className="vs-brand">Vault OS</span><span className="vs-muted">{community ? `${community.total.toLocaleString()} members` : 'Trading community'}</span></header>
  <div className="vs-tabs" role="tablist" aria-label="Sidebar views">{(['community','mine'] as const).map(t=><button key={t} role="tab" aria-selected={tab===t} onClick={()=>setParams(p=>{const n=new URLSearchParams(p);n.set('space',t);return n;},{replace:true})}>{t==='community'?<Users size={17}/>:<UserRound size={17}/>} {t==='community'?'Community':'My space'}</button>)}</div>
  <div className="vs-body" role="tabpanel">
  {tab==='community'?<>
   <Link className="vs-live" to="/academy/live"><span><strong>Vault Live</strong><small>Sessions & replays</small></span><ArrowUpRight size={18}/></Link>
   <section><div className="vs-heading"><h3>Watch with RZ</h3><span>Daily picks</span></div>{videos.map(v=><a className="vs-video" key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer"><div><img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt=""/><Play size={18}/></div><span>{v.title}<small>RZ · YouTube <ArrowUpRight size={11}/></small></span></a>)}<a className="vs-channel" href="https://www.youtube.com/@rubenzamora__" target="_blank" rel="noopener noreferrer">More from RZ <ArrowUpRight size={13}/></a></section>
    <Popover open={member!==null} onOpenChange={open=>{if(!open)setMember(null);}}><section><div className="vs-heading"><h3>Online now</h3><i className="vs-dot"/></div>{community?.online.slice(0,3).map(m=>{const trigger=<button ref={node=>{if(node)memberTriggers.current.set(m.user_id,node);else memberTriggers.current.delete(m.user_id);}} className="vs-member" aria-label={`View ${m.display_name}'s profile`} aria-expanded={member===m.user_id} onClick={()=>setMember(m.user_id)}><span className="vs-avatar">{m.avatar_url?<img src={m.avatar_url} alt="" onError={e=>{e.currentTarget.style.display="none";}}/>:m.display_name.slice(0,1)}<i className="vs-dot"/></span><span>{m.display_name}</span><ArrowUpRight size={14}/></button>;return member===m.user_id?<PopoverAnchor asChild key={m.user_id}>{trigger}</PopoverAnchor>:<span key={m.user_id} className="contents">{trigger}</span>;})}{community && !community.online.length && <p className="vs-muted">No members active right now.</p>}{!community&&<p className="vs-muted">Connecting…</p>}{member&&<PopoverContent className="member-profile-popover w-auto border-0 bg-transparent p-0 shadow-none" side="left" align="end" sideOffset={10} collisionPadding={12} onCloseAutoFocus={event=>{event.preventDefault();memberTriggers.current.get(member)?.focus();}}><UserProfileCard key={member} userId={member} onClose={()=>setMember(null)}/></PopoverContent>}</section></Popover>
   <button className="vs-personal-link" onClick={()=>setParams(p=>{const n=new URLSearchParams(p);n.set('space','mine');return n;},{replace:true})}>Your rules. Your reminders. <ArrowUpRight size={15}/></button>
  </>:<>
   <div className="vs-private"><LockKeyhole size={12}/> Only you can see this</div>
   <fieldset disabled={!ready||saving}>
   <section><div className="vs-heading"><h3>My rules</h3><span>{settings.rules.length}/12</span></div>{settings.rules.map((rule,i)=><div className="vs-rule" key={i}><span>{rule}</span><button aria-label={`Delete rule ${i+1}`} onClick={()=>update({rules:settings.rules.filter((_,n)=>n!==i)})}><Trash2 size={14}/></button></div>)}
   <form className="vs-add" onSubmit={e=>{e.preventDefault();if(draft.trim()&&settings.rules.length<12){update({rules:[...settings.rules,draft.trim()]});setDraft('');}}}><input aria-label="New trading rule" placeholder="Add your own rule" maxLength={180} value={draft} onChange={e=>setDraft(e.target.value)}/><button aria-label="Add rule" disabled={!draft.trim()||settings.rules.length>=12}><Plus size={17}/></button></form></section>
   <section><label className="vs-label" htmlFor="vs-notes">Notes</label><textarea id="vs-notes" placeholder="What do you want to remember?" maxLength={2000} rows={3} value={settings.notes} onChange={e=>update({notes:e.target.value})}/></section>
   <section><label className="vs-enable"><span><Bell size={15}/> Daily reminders</span><input type="checkbox" checked={settings.enabled} onChange={e=>update({enabled:e.target.checked})}/></label>
    <div className="vs-times"><label>Morning<span className="vs-time-field"><input type="time" max="11:59" value={settings.morning} onChange={e=>update({morning:e.target.value})}/></span></label><label>Afternoon<span className="vs-time-field"><input type="time" min="12:00" value={settings.afternoon} onChange={e=>update({afternoon:e.target.value})}/></span></label></div>
    <label className="vs-label" htmlFor="vs-timezone">Time zone</label><input id="vs-timezone" value={settings.timezone} onChange={e=>update({timezone:e.target.value})} list="vs-zones"/><datalist id="vs-zones">{['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Dubai','Asia/Kolkata','Asia/Tokyo','Australia/Sydney'].map(z=><option key={z} value={z}/>)}</datalist>
    <label className="vs-weekdays"><input type="checkbox" checked={settings.weekdays_only} onChange={e=>update({weekdays_only:e.target.checked})}/> Weekdays only</label>
    <small className="vs-muted">Twice a day, a private reminder to review your rules and notes.</small>
   </section><button className="vs-save" onClick={save}>{saving?'Saving…':'Save my space'}</button>
   </fieldset><button className="vs-device" onClick={enableDevice}><Bell size={14}/> Enable device notifications</button>
  </>}
  {error&&<p role="alert" className="vs-error">{error}</p>}{status&&<p role="status" className="vs-muted">{status}</p>}
  </div>
 </aside>;
}
