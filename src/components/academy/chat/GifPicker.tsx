import {useState,useEffect,useRef} from 'react';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Search,X,RefreshCw} from 'lucide-react';
import {Skeleton} from '@/components/ui/skeleton';
import {supabase} from '@/integrations/supabase/client';
import './gif-picker.css';
interface GifResult {id:string;title:string;url:string;preview_url:string;}
export function GifPicker({onSelect,embedded=false,onClose}:{onSelect:(url:string)=>void;embedded?:boolean;onClose?:()=>void}){
 const cache=useRef(new Map<string,{time:number;gifs:GifResult[]}>());
 const [ownOpen,setOwnOpen]=useState(false),[search,setSearch]=useState(''),[gifs,setGifs]=useState<GifResult[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const open=embedded||ownOpen;
 const setOpen=(value:boolean)=>{setOwnOpen(value);if(!value&&embedded)onClose?.();};
 useEffect(()=>{
  if(!open)return;
  const q=search.trim();
  const cached=cache.current.get(q);
  if(cached && Date.now()-cached.time<5*60*1000){setGifs(cached.gifs);setLoading(false);setError(false);return;}
  let current=true;setLoading(true);setError(false);
  const controller=new AbortController();
  let deadline:ReturnType<typeof setTimeout>;
  const timer=setTimeout(async()=>{try{
   const {data,error:failure}=await Promise.race([
    supabase.functions.invoke('giphy-search',{body:q?{q,type:'search'}:{type:'trending'},signal:controller.signal}),
    new Promise<never>((_,reject)=>{deadline=setTimeout(()=>{controller.abort();reject(new Error('GIF request timed out'));},10000);}),
   ]);
   if(failure)throw failure;
   const results=Array.isArray(data?.gifs)?data.gifs.filter((g:GifResult)=>g.url&&g.preview_url):[];
   if(current){
    if(cache.current.size>=20)cache.current.delete(cache.current.keys().next().value!);
    cache.current.set(q,{time:Date.now(),gifs:results});setGifs(results);
   }
  }catch{if(current){setError(true);setGifs([]);}}finally{clearTimeout(deadline);if(current)setLoading(false);}},q?200:0);
  return()=>{current=false;clearTimeout(timer);clearTimeout(deadline);controller.abort();};
 },[open,search,retry]);
 const content=<>
   <header className="vg-header"><div><h3>Find your reaction</h3><span>Search GIFs from GIPHY</span></div><button type="button" aria-label="Close GIF picker" onClick={()=>setOpen(false)}><X size={20}/></button></header>
   <div className="vg-search"><Search size={19}/><input aria-label="Search GIFs" placeholder="Search a mood or reaction…" value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/>{search&&<button type="button" aria-label="Clear GIF search" onClick={()=>setSearch('')}><X size={18}/></button>}</div>
   <div className="vg-results" aria-busy={loading}><div className="vg-label">{search.trim()?'Search results':'Trending now'}</div>
    {loading?<div className="vg-grid">{Array.from({length:6},(_,i)=><Skeleton key={i} className="vg-tile"/>)}</div>:error?<div className="vg-empty" role="status"><strong>GIFs couldn’t load.</strong><p>Your message is still here. Try again.</p><button type="button" onClick={()=>setRetry(v=>v+1)}><RefreshCw size={16}/> Try again</button></div>:gifs.length===0?<div className="vg-empty" role="status"><strong>No GIFs found.</strong><p>Try another word, like “celebrate”.</p></div>:<div className="vg-grid">{gifs.map(g=><button className="vg-tile" key={g.id} type="button" aria-label={`Send ${g.title||'GIF'}`} onClick={()=>{onSelect(g.url);setOpen(false);}}><img src={g.preview_url} alt={g.title||'GIF'} loading="lazy"/></button>)}</div>}
   </div><footer><span>Tap a GIF to send</span><span>Powered by <strong>GIPHY</strong></span></footer>
 </>;
 if(embedded)return <div className="vault-gif-picker" aria-label="GIF picker">{content}</div>;
 return <Popover open={open} onOpenChange={v=>{setOpen(v);if(v)setSearch('');}}>
  <PopoverTrigger asChild><button type="button" className="vault-gif-trigger" title="GIF" aria-label="Choose a GIF">GIF</button></PopoverTrigger>
  <PopoverContent side="top" align="start" sideOffset={10} collisionPadding={12} className="vault-gif-picker" aria-label="GIF picker" onOpenAutoFocus={e=>e.preventDefault()}>{content}</PopoverContent>
 </Popover>;
}
