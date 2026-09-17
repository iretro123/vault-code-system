import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, MessageCircle, Plus, Search, Send, X, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ChatAvatar } from '@/lib/chatAvatars';
import { useMemberMessages, type Member } from '@/hooks/useMemberMessages';
import './academy-messages.css';
import {MemberMedia,MemberMediaTools} from '@/components/academy/dm/MemberMedia';
import {MemberMessageSearch} from '@/components/academy/dm/MemberMessageSearch';
import {useMemberFriends} from '@/hooks/useMemberFriends';
import {MemberDetails} from '@/components/academy/dm/MemberDetails';

function readDraft(key:string) {try{return sessionStorage.getItem(key)||'';}catch{return '';}}
export default function AcademyMessages() {
  const {user,profile}=useAuth();
  const [params,setParams]=useSearchParams();
  const selected=params.get('conversation');
  const requestedMember=params.get('member');
  const api=useMemberMessages(user?.id,selected);
  const social=useMemberFriends(user?.id);
  const [creating,setCreating]=useState(!!params.get('find'));
  const [query,setQuery]=useState(params.get('find') || '');
  const [results,setResults]=useState<Member[]>([]);
  const [searching,setSearching]=useState(false);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [draft,setDraft]=useState('');
  const [newBelow,setNewBelow]=useState(false);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const entryHandled=useRef(false);
  const list=useRef<HTMLDivElement>(null);
  const composer=useRef<HTMLTextAreaElement>(null);
  const apiRef=useRef(api); apiRef.current=api;
  const draftKey=`vault-member-draft:${user?.id}:${selected}`;
  const thread=api.conversations.find(c=>c.id===selected);
  const peerId=thread ? thread.member_a===user?.id ? thread.member_b : thread.member_a : '';
  const peer=api.profiles[peerId];
  const peerName=peer?.display_name || 'Vault member';
  const blocked=api.blocked.includes(peerId);
  const choose=(id:string)=>{entryHandled.current=true;setDetailsOpen(false);setParams({conversation:id});setCreating(false);setQuery('');setNotice('');};
  const back=()=>{entryHandled.current=true;setParams({});setNotice('');};

  useEffect(()=>{
    if(!requestedMember) {setBusy(false);return;}
    if(api.loading || !user?.id) return;
    let active=true;setBusy(true);
    apiRef.current.openMember(requestedMember).then(id=>{
      if(active && id){setBusy(false);setParams({conversation:id},{replace:true});}
    }).catch(()=>{if(active)setNotice('This conversation could not open. The member may be unavailable or messaging may be blocked.');})
      .finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[requestedMember,api.loading,user?.id,setParams]);

  // A DM entry point resumes a conversation once, without trapping the mobile Back button.
  useEffect(()=>{
    if(api.loading || !user?.id) return;
    if(selected || requestedMember || params.has('find')) {entryHandled.current=true;return;}
    if(entryHandled.current && params.get('resume')!=='1') return;
    entryHandled.current=true;
    let saved='';try{saved=sessionStorage.getItem(`vault-member-last:${user.id}`)||'';}catch{/* optional */}
    const target=api.conversations.find(c=>c.id===saved)||api.conversations[0];
    setParams(target?{conversation:target.id}:{},{replace:true});
  },[params,selected,requestedMember,api.loading,api.conversations,user?.id,setParams]);
  useEffect(()=>{
    if(selected && thread && user?.id)try{sessionStorage.setItem(`vault-member-last:${user.id}`,selected);}catch{/* optional */}
  },[selected,thread,user?.id]);

  useEffect(()=>{setDraft(readDraft(draftKey));setNewBelow(false);setNotice('');},[draftKey]);
  useEffect(()=>{
    if(composer.current) {composer.current.style.height='auto';composer.current.style.height=`${Math.min(composer.current.scrollHeight,140)}px`;}
  },[draft]);
  const updateDraft=(value:string)=>{setDraft(value);try{sessionStorage.setItem(draftKey,value);}catch{/* optional storage */}};
  useEffect(()=>{
    const el=list.current; if(!el) return;
    if(api.nearBottom.current) {el.scrollTop=el.scrollHeight;setNewBelow(false);void apiRef.current.markRead();} else setNewBelow(true);
  },[api.messages,api.nearBottom]);
  useEffect(()=>{
    if(!creating) {setResults([]);setSearching(false);return;}
    let alive=true;setSearching(true);setNotice('');
    const timer=setTimeout(async()=>{
      try{const rows=await apiRef.current.search(query);if(alive)setResults(rows);}
      catch{if(alive)setNotice('Member search is unavailable. Please try again.');}
      finally{if(alive)setSearching(false);}
    },query.trim()?200:0);
    return()=>{alive=false;clearTimeout(timer);};
  },[query,creating]);
  async function start(member:Member) {
    setBusy(true);setNotice('');
    try{const id=await api.open(member);if(id)choose(id);}catch{setNotice('Could not open this conversation. Please try again.');}finally{setBusy(false);}
  }
  async function send() {
    if(!draft.trim()||busy||blocked)return;
    const text=draft; updateDraft('');setBusy(true);
    await api.send(text);setBusy(false);composer.current?.focus();
    // Failed text stays in its message row with Retry; a newer draft is never overwritten.
  }
  return <section className={`vault-messages ${selected?'has-conversation':''}`} aria-label="Member messages">
    <aside className="vm-sidebar">
      <header className="vm-heading"><h1>Messages</h1></header>
      <button className="vm-find" aria-label="New message" onClick={()=>{setCreating(true);setQuery('');setNotice('');}}><Search size={18}/> Find a member</button>
      {(social.friends.length>0||social.error)&&<>
      <details className="vm-friends"><summary>Friends <span>{social.friends.filter(f=>f.accepted).length}</span></summary><p>Add friends from a conversation. You can message members without adding them first.</p>{social.error&&<p role="alert">{social.error}</p>}{social.friends.map(f=><div className="vm-friend" key={f.user_id}><button onClick={()=>void start(f)}><ChatAvatar userName={f.display_name} avatarUrl={f.avatar_url} size="h-8 w-8"/><span>{f.display_name}<small>{f.accepted?'Friend':f.incoming?'Wants to be friends':'Request sent'}</small></span></button>{f.incoming&&!f.accepted&&<button onClick={()=>void social.change(f,'accept').catch(()=>setNotice('Could not accept request.'))}>Accept</button>}<button aria-label={`Remove ${f.display_name}`} onClick={()=>void social.change(f,'remove').catch(()=>setNotice('Could not remove friend.'))}><X size={15}/></button></div>)}</details>
      </>}
      {requestedMember && busy && <p className="vm-muted" role="status">Opening conversation…</p>}
      <nav className="vm-conversations" aria-label="Conversations">
        {api.loading?<p className="vm-muted" role="status">Loading conversations…</p>:api.conversations.length===0?<div className="vm-empty-list"><MessageCircle/><p>Your conversations start here.</p><button onClick={()=>setCreating(true)}>Find a member</button></div>:api.conversations.map(c=>{
          const id=c.member_a===user?.id?c.member_b:c.member_a;
          const p=api.profiles[id];return <button key={c.id} className={`vm-person ${selected===c.id?'selected':''}`} onClick={()=>choose(c.id)} aria-current={selected===c.id?'page':undefined}>
            <ChatAvatar userName={p?.display_name||'Member'} avatarUrl={p?.avatar_url} size="h-11 w-11"/>
            <span><strong>{p?.display_name||'Vault member'}</strong><small>{api.blocked.includes(id)?'Blocked':c.last_message||'Direct message'}</small></span>{c.last_sender_id&&c.last_sender_id!==user?.id&&c.updated_at>(c.member_a===user?.id?c.read_a_at||'':c.read_b_at||'')?<span className="vm-unread" aria-label="Unread messages"/>:<time>{new Date(c.updated_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time>}
          </button>;
        })}
      </nav>
      {api.preview&&<p className="vm-preview-note">Local preview · messages aren’t sent</p>}
    </aside>
    <div className="vm-thread">
      {!selected?<div className="vm-welcome"><div className="vm-welcome-icon"><MessageCircle size={32}/></div><h2>A little more connected.</h2><p>Talk through a lesson, share a question, or catch up after class.</p><button className="vm-primary" onClick={()=>setCreating(true)}><Plus size={17}/> New message</button></div>:<>
        <header className="vm-thread-heading"><button className="vm-icon vm-mobile-back" onClick={back} aria-label="Back to messages"><ArrowLeft size={21}/></button><button className="vm-peer-profile" onClick={()=>setDetailsOpen(true)} disabled={!peer} aria-label={`View ${peerName} profile`}><ChatAvatar userName={peerName} avatarUrl={peer?.avatar_url} size="h-10 w-10"/><span><h2>{peerName}</h2><small>{api.preview?'Local preview':api.connected?'Direct message · Connected':'Reconnecting…'}</small></span></button><button className="vm-icon vm-details-button" aria-label="Member details and shared media" disabled={!peer} onClick={()=>setDetailsOpen(true)}><UserRound size={19}/></button>{peerId&&<button className="vm-block" onClick={async()=>{try{await api.toggleBlock(peerId);}catch{setNotice('Could not update block settings. Try again.');}}}>{blocked?'Unblock':'Block'}</button>}</header>
        {api.preview&&<div className="vm-mobile-preview">Local demo · messages stay in this preview</div>}
        <div className="vm-conversation-tools"><MemberMessageSearch conversation={selected} preview={api.preview} messages={api.messages}/>{peer&&<button disabled={blocked} className="vm-friend-action" onClick={async()=>{const friend=social.friends.find(f=>f.user_id===peerId);try{await social.change(peer,!friend?'request':friend.incoming&&!friend.accepted?'accept':'remove');}catch{setNotice('Could not update friendship. Please try again.');}}}>{(()=>{const f=social.friends.find(f=>f.user_id===peerId);return !f?'Add friend':f.accepted?'Friends · Remove':f.incoming?'Accept friend':'Requested · Cancel';})()}</button>}</div>
        <div ref={list} className="vm-history" onScroll={()=>{const el=list.current;if(el){api.nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<90;if(api.nearBottom.current)setNewBelow(false);}}} role="log" aria-label={`Conversation with ${peerName}`} aria-live="polite" aria-relevant="additions">
          {api.hasOlder&&<button className="vm-older" disabled={api.historyLoading} onClick={async()=>{const el=list.current;const before=el?.scrollHeight||0;const top=el?.scrollTop||0;api.nearBottom.current=false;await api.loadOlder();requestAnimationFrame(()=>{if(el)el.scrollTop=top+el.scrollHeight-before;});}}>Load earlier messages</button>}
          {api.historyLoading&&<p role="status" className="vm-muted">Loading messages…</p>}
          {!api.historyLoading&&!api.messages.length&&<div className="vm-start"><h3>Say hello to {peerName.split(' ')[0]}.</h3><p>A good conversation starts with a question.</p></div>}
          {api.messages.map((m,i)=>{
            const previous=api.messages[i-1];const date=new Date(m.created_at);const dayBreak=!previous||date.toDateString()!==new Date(previous.created_at).toDateString();
            const grouped=!dayBreak&&previous?.sender_id===m.sender_id&&date.getTime()-new Date(previous.created_at).getTime()<300000;
            const mine=m.sender_id===user?.id;const name=mine?(profile?.display_name||'You'):peerName;
            return <div key={m.id}>{dayBreak&&<div className="vm-date"><span>{date.toLocaleDateString(undefined,{month:'long',day:'numeric'})}</span></div>}<article className={`vm-message ${grouped?'grouped':''} ${m.status==='failed'?'failed':''}`}>
              <div className="vm-avatar-slot">{!grouped&&<ChatAvatar userName={name} avatarUrl={mine?profile?.avatar_url:peer?.avatar_url} size="h-9 w-9"/>}</div>
              <div className="vm-message-content">{!grouped&&<div className="vm-author"><strong>{name}</strong><time title={date.toLocaleString()}>{date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</time></div>}<p>{m.body}</p>{m.attachments?.map((attachment,index)=><MemberMedia key={`${m.id}-${index}`} attachment={attachment}/>)}{m.status==='sending'&&<small>Sending…</small>}{m.status==='failed'&&<div className="vm-send-failed" role="status">Not sent <button disabled={blocked} onClick={()=>void api.send(m.body,m)}>Retry</button></div>}</div>
            </article></div>;
          })}
        </div>
        {newBelow&&<button className="vm-new-below" onClick={()=>{api.nearBottom.current=true;if(list.current)list.current.scrollTop=list.current.scrollHeight;setNewBelow(false);}}>Latest messages <ChevronDown size={15}/></button>}
        <footer className="vm-compose-wrap"><form className="vm-compose" onSubmit={e=>{e.preventDefault();void send();}}><textarea ref={composer} aria-label={`Message ${peerName}`} placeholder={blocked?'Unblock this member to message':`Message ${peerName.split(' ')[0]}…`} value={draft} maxLength={4000} rows={1} disabled={blocked||!thread} onChange={e=>updateDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&window.matchMedia('(min-width: 768px)').matches){e.preventDefault();void send();}}}/><button className="vm-send" aria-label="Send message" type="submit" disabled={!draft.trim()||busy||blocked||!thread}><Send size={20}/></button></form>{user&&<MemberMediaTools key={`${user.id}:${selected}`} conversation={selected} userId={user.id} disabled={busy||blocked||!thread} onEmoji={emoji=>updateDraft((draft+emoji).slice(0,4000))} onSend={attachment=>api.send('',undefined,[attachment])}/>}<div className="vm-compose-hint"><span>{blocked?'You have blocked this member.':'Be kind. Learn together.'}</span><span>{draft.length>3600?`${draft.length}/4000`:''}</span></div></footer>
      </>}
      {(api.error||notice)&&!creating&&<div className="vm-error" role="alert">{notice||api.error}<button onClick={()=>{setNotice('');void api.refresh();}}>Retry</button></div>}
    </div>
    {peer&&detailsOpen&&<MemberDetails key={peer.user_id} member={peer} messages={api.messages} open={detailsOpen} onClose={()=>setDetailsOpen(false)}/>}
    {creating&&createPortal(<div className="vm-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget)setCreating(false);}}><div role="dialog" aria-modal="true" aria-labelledby="vm-new-title" className="vm-dialog" onKeyDown={e=>{
      if(e.key==='Escape')setCreating(false);
      if(e.key==='Tab'){const nodes=e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input');const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    }}><header><h2 id="vm-new-title">New message</h2><button className="vm-icon" aria-label="Close member search" onClick={()=>setCreating(false)}><X size={20}/></button></header>
      <p>{query.trim()?'Find a member by name or username.':'RZ and recently active members.'}</p>
      <label className="vm-search"><Search size={18}/><input aria-label="Search members" placeholder="Search members…" value={query} maxLength={80} onChange={e=>setQuery(e.target.value)}/></label>
      <div className="vm-search-results">{searching?<p role="status">Loading members…</p>:results.map(p=><button className="vm-person" key={p.user_id} disabled={busy||p.user_id===user?.id} onClick={()=>void start(p)}><ChatAvatar userName={p.display_name} avatarUrl={p.avatar_url} size="h-10 w-10"/><span><strong>{p.display_name}{p.user_id===user?.id?' (you)':''}</strong><small>{p.is_rz?'Vault founder':p.username?`@${p.username}`:'Recently active in community'}</small></span>{p.user_id!==user?.id&&<MessageCircle size={18}/>}</button>)}{!searching&&!results.length&&!notice&&<p>{query.trim()?'No members found. Try another name.':'No recent members to show yet.'}</p>}</div>{notice&&<p role="alert">{notice}</p>}</div></div>,document.body)}
  </section>;
}
