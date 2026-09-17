import {useEffect,useState} from 'react';
import {getVideoEmbedUrl} from '@/lib/videoEmbeds';

export function safeLessonVideoUrl(value:string){
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}

/** Frame loading is not proof of playback; always retain an original-video exit. */
export function LessonVideo({url,title}:{url:string;title:string}){
  const source=safeLessonVideoUrl(url);
  const embed=source?getVideoEmbedUrl(source):null;
  const [attempt,setAttempt]=useState(0);
  const [status,setStatus]=useState<'loading'|'loaded'|'slow'>('loading');
  useEffect(()=>{
    setStatus('loading');
    const timer=setTimeout(()=>setStatus(s=>s==='loading'?'slow':s),12000);
    return()=>clearTimeout(timer);
  },[url,attempt]);
  if(!source)return <div className="p-10 text-center text-sm text-slate-300">{url?'This lesson’s video link needs updating. Please contact support.':'No video has been added to this lesson yet.'}</div>;
  return <div>
    {embed&&<div className="relative aspect-video w-full bg-black">
      <iframe key={`${url}:${attempt}`} src={embed} title={title} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>setStatus('loaded')} onError={()=>setStatus('slow')}/>
    </div>}
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/10 px-4 py-3 text-sm text-slate-300">
      {embed&&status==='loading'&&<span role="status">Loading player…</span>}
      {embed&&status==='slow'&&<span role="status">Player taking longer than expected.</span>}
      {embed&&<button className="min-h-11 text-blue-200 underline underline-offset-4" onClick={()=>setAttempt(a=>a+1)}>Reload player</button>}
      <a className="inline-flex min-h-11 items-center text-blue-200 underline underline-offset-4" href={source} target="_blank" rel="noopener noreferrer">{embed?'Open original video':'Watch video on provider'} ↗</a>
    </div>
  </div>;
}
