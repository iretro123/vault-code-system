import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {Search,X} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import type {MemberMessage} from '@/hooks/useMemberMessages';
export function MemberMessageSearch({conversation,preview,messages}:{conversation:string;preview:boolean;messages:MemberMessage[]}){
 const [open,setOpen]=useState(false),[term,setTerm]=useState(''),[results,setResults]=useState<MemberMessage[]>([]),[status,setStatus]=useState('');
 useEffect(()=>{setTerm('');setResults([]);setOpen(false);},[conversation]);
 useEffect(()=>{
  if(!open||term.trim().length<2){setResults([]);setStatus('Enter at least 2 letters.');return;}
  let active=true;setStatus('Searching…');const timer=setTimeout(async()=>{
   try{
    let rows:MemberMessage[];
    if(preview)rows=messages.filter(m=>m.body.toLowerCase().includes(term.trim().toLowerCase())).slice(-50).reverse();
    else{const {data,error}=await (supabase as SupabaseClient).rpc('search_member_messages',{conversation,term:term.trim()});if(error)throw error;rows=data||[];}
    if(active){setResults(rows);setStatus(rows.length?`${rows.length} ${rows.length===1?'match':'matches'}${rows.length===50?' · most recent 50':''}`:'No messages found.');}
   }catch{if(active){setResults([]);setStatus('Search could not connect. Try again.');}}
  },250);return()=>{active=false;clearTimeout(timer);};
 },[conversation,term,open,preview,messages]);
 return <div className="vm-message-search"><button className="vm-search-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Search size={16}/> Find a message</button>{open&&<section aria-label="Search this conversation" className="vm-search-panel"><label><Search size={17}/><input autoFocus aria-label="Search this conversation" value={term} maxLength={100} placeholder="Search this conversation…" onChange={e=>setTerm(e.target.value)}/><button aria-label="Close message search" onClick={()=>setOpen(false)}><X size={18}/></button></label><small role="status">{status}</small><div className="vm-search-matches">{results.map(m=><article key={m.id}><time>{new Date(m.created_at).toLocaleString()}</time><p>{m.body}</p></article>)}</div></section>}</div>;
}
