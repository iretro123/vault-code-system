import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, BookOpen, Check, ChevronRight, Compass, Headphones, MessageCircle, RotateCcw, Square, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import DemandStudyChart from '@/design-studio/DemandStudyChart';
import { answerGuide, GUIDES, GuideAnswer, AtlasWorkedExample } from './atlasGuide';
import { isLocalDesignPreview, localPreviewFetch } from '@/integrations/supabase/localPreviewFetch';
import { supabase } from '@/integrations/supabase/client';
import { useAtlasVoice } from './useAtlasVoice';
import AtlasExample from './AtlasExample';
import type { VisualTopic } from './atlasScenarios';
import './atlas-mentor.css';
import AtlasWelcome from './AtlasWelcome';
import {vaultResourceFor} from '../../../../supabase/functions/_shared/atlasVaultKnowledge';

type Turn={ id:string; question:string; answer:GuideAnswer & {workedExample?:AtlasWorkedExample}; choice?:number };
function readTurns(key:string):Turn[]{
  try {const data=JSON.parse(sessionStorage.getItem(key)||'[]');return Array.isArray(data)?data.filter(t=>typeof t?.id==='string' && typeof t?.question==='string' && typeof t?.answer?.text==='string' && typeof t?.answer?.title==='string').slice(-30):[];}catch{return [];}
}

function Practice({turn,onChoice}:{turn:Turn;onChoice:(choice:number)=>void}) {
  const topic=turn.answer.topic;
  const check=turn.answer.check;
  if(!check && (!topic || !GUIDES[topic]))return null;
  const guide=check?{question:check.question,choices:check.choices,correct:check.correctIndex,feedback:[check.explanation,check.explanation]}:GUIDES[topic!];
  return <section className="atlas-practice" aria-label="Check your understanding">
    <div className="atlas-eyebrow">YOUR TURN <span>One quick check</span></div>
    {turn.answer.chart && <DemandStudyChart reveal={turn.choice!==undefined}/>}
    <p className="atlas-question">{guide.question}</p>
    <div className="atlas-choices">{guide.choices.map((choice,i)=><button key={choice} aria-pressed={turn.choice===i} onClick={()=>onChoice(i)} disabled={turn.choice!==undefined} className={turn.choice===i?'is-chosen':''}><span>{String.fromCharCode(65+i)}</span>{choice}{turn.choice===i&&i===guide.correct&&<Check size={18}/>}</button>)}</div>
    {turn.choice!==undefined && <p role="status" className="atlas-feedback">{guide.feedback[turn.choice]}</p>}
  </section>;
}

export default function AtlasMentor(){
  const {user,profile}=useAuth();
  const navigate=useNavigate();
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState('');
  const [state,setState]=useState<{key:string;turns:Turn[]}>({key:'',turns:[]});
  const key=`vault-atlas-preview-v1:${user?.id||'signed-out'}`;
  const turns=state.key===key?state.turns:[];
  const [practiceId,setPracticeId]=useState<string|null>(null);
  const [notice,setNotice]=useState('');
  const [connected,setConnected]=useState(false);
  const [pending,setPending]=useState('');
  const request=useRef<AbortController|null>(null);
  const end=useRef<HTMLDivElement>(null);
  const body=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLTextAreaElement>(null);
  const voice=useAtlasVoice();
  const latest=turns.at(-1);
  const lastTopic=[...turns].reverse().find(t=>t.answer.topic)?.answer.topic;
  const sendRef=useRef<(text:string)=>void>(()=>{});
  const name=profile?.display_name?.split(' ')[0] || 'there';
  useEffect(()=>{if(!isLocalDesignPreview()){setConnected(import.meta.env.VITE_ATLAS_ENABLED==='true');return;}const controller=new AbortController();fetch('/__atlas',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(data=>setConnected(data?.configured===true)).catch(()=>{});return()=>controller.abort();},[]);
  const cancel=useCallback(()=>{request.current?.abort();request.current=null;setPending('');},[]);
  useEffect(()=>{cancel();setState({key,turns:readTurns(key)});setPracticeId(null);setInput('');voice.stop();},[key,voice.stop,cancel]);
  const save=useCallback((next:Turn[])=>{
    const bounded=next.slice(-30);setState({key,turns:bounded});
    try{sessionStorage.setItem(key,JSON.stringify(bounded));}catch{setNotice('This browser could not save your conversation. It will remain here until you leave.');}
  },[key]);
  const send=async(text:string)=>{
    const question=text.trim().slice(0,1000);if(!question||request.current)return;
    voice.stop();setNotice('');setPracticeId(null);
    let answer:Turn['answer']=answerGuide(question,lastTopic);
    if(connected){
      const controller=new AbortController();request.current=controller;setPending(question);
      try{
        const history=turns.slice(-7).flatMap(t=>{
          const messages=[{role:'user',content:t.question},{role:'assistant',content:t.answer.text}];
          const quiz=t.answer.check || (t.answer.topic?GUIDES[t.answer.topic]:undefined);
          if(t.choice!==undefined && quiz)messages.push({role:'user',content:`For the practice question "${quiz.question}", I chose "${quiz.choices[t.choice]}".`});
          return messages;
        });
        const local=isLocalDesignPreview();
        const headers:Record<string,string>={'Content-Type':'application/json'};
        if(!local){const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error('Please sign in again.');headers.Authorization=`Bearer ${session.access_token}`;}
        const response=await localPreviewFetch(local?`${window.location.origin}/__atlas`:`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/atlas-chat`,{method:'POST',signal:controller.signal,headers,body:JSON.stringify({messages:[...history,{role:'user',content:question}]})});
        const data=await response.json();if(!response.ok)throw new Error(data.error||'The answer could not be loaded.');
        if(request.current!==controller)return;
        const actions:Record<string,{label:string;path:string}>={learn:{label:'Continue learning',path:'/academy/learn'},trade:{label:'Open Trade OS',path:'/academy/trade'},setup:{label:'Open your trading setup',path:'/academy/setup'},support:{label:'Talk with RZ',path:'/academy/support'}};
        answer={title:'Let’s work through it.',text:data.answer,generated:true,topic:answer.topic,check:data.check||undefined,references:data.sourceLabels||[],workedExample:data.workedExample||undefined,link:data.actionId?actions[data.actionId]:undefined};
      }catch(error){if(!controller.signal.aborted){setInput(question);setNotice(error instanceof Error?error.message:'The connection failed. Try again.');}return;}
      finally{if(request.current===controller){request.current=null;setPending('');}}
    }
    const resource=vaultResourceFor(question);
    if(resource)answer={...answer,source:resource};
    setInput('');save([...turns,{id:crypto.randomUUID(),question,answer}]);inputRef.current?.focus();
  };
  sendRef.current=send;
  useEffect(()=>{
    const handler=(e:Event)=>{
      const detail=(e as CustomEvent).detail;
      if(detail?.tab==='coach'){
        setOpen(false);window.dispatchEvent(new CustomEvent('open-legacy-coach',{detail:{tab:'coach'}}));return;
      }
      if(detail?.question){setOpen(true);sendRef.current(detail.question);}else setOpen(v=>!v);
    };
    window.addEventListener('toggle-coach-drawer',handler);return()=>window.removeEventListener('toggle-coach-drawer',handler);
  },[]);
  useEffect(()=>{if(!open){voice.stop();cancel();}},[open,voice.stop,cancel]);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{if(open&&turns.length)end.current?.scrollIntoView({block:'nearest',behavior:'auto'});},[turns.length,practiceId,open]);
  if(!user)return null;
  const go=(path:string)=>{setOpen(false);navigate(path);};
  const human=()=>{setOpen(false);window.dispatchEvent(new CustomEvent('open-legacy-coach',{detail:{tab:'coach'}}));};
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="atlas-dialog" onOpenAutoFocus={e=>e.preventDefault()}>
    <header className="atlas-header">
      <div className="atlas-mark" aria-hidden="true"><Compass size={25} strokeWidth={1.5}/></div>
      <div><DialogTitle className="atlas-name">Atlas <span>VAULT AI MENTOR</span></DialogTitle><DialogDescription className="atlas-description">A little clarity. A better next step.</DialogDescription></div>
    </header>
    <div className="atlas-utility"><span>{connected?'AI mentor · Teaching references enabled':null}</span><div><button onClick={human}><MessageCircle size={15}/> <span>Human coach</span></button><button className="atlas-chat-reset" onClick={()=>{cancel();voice.stop();setNotice('New chat started.');save([]);setPracticeId(null);setInput('');if(body.current)body.current.scrollTop=0;inputRef.current?.focus();}} aria-label="Start a new conversation"><RotateCcw size={15}/><span>New chat</span></button></div></div>
    <div className="atlas-body" ref={body}>
      {!turns.length ? <div className="atlas-welcome atlas-welcome-visual">
        <AtlasWelcome name={name} active={open} skip={!!input||!!pending}/>
      </div> : <div className="atlas-conversation" role="log" aria-label="Conversation with Atlas" aria-live="polite" aria-relevant="additions">
        {turns.map(turn=><div className="atlas-turn" key={turn.id}>
          <div className="atlas-user"><span className="sr-only">You: </span>{turn.question}</div>
          <article className="atlas-answer">
            <div className="atlas-answer-byline"><Compass size={17}/><span>Atlas</span><span className="atlas-authored">{turn.answer.generated?'AI response':'Teaching example'}</span></div>
            <h3>{turn.answer.title}</h3><p>{turn.answer.text}</p>
            {turn.answer.example&&<div className="atlas-example"><span>IN PRACTICE</span><p>{turn.answer.example}</p></div>}
            {turn.answer.workedExample&&<section className="atlas-example" aria-label="Code-checked hypothetical example"><span>WORKED EXAMPLE · {turn.answer.workedExample.inputs.market.toUpperCase()}</span><p>{turn.answer.workedExample.assumption}</p><p className="atlas-formula">{turn.answer.workedExample.formula}</p><p><strong>{turn.answer.workedExample.net.toLocaleString('en-US',{style:'currency',currency:'USD'})}</strong> hypothetical net result</p><p>{turn.answer.workedExample.caution}</p></section>}
            {turn.answer.caution&&<p className="atlas-caution">{turn.answer.caution}</p>}
            {!!turn.answer.references?.length&&<p className="atlas-caution">Teaching references: {turn.answer.references.join(' · ')}</p>}
            <div className="atlas-answer-actions"><button onClick={()=>voice.speak(turn.id,[turn.answer.title,turn.answer.text,turn.answer.example,turn.answer.caution].filter(Boolean).join(' '))} aria-pressed={voice.speaking===turn.id}>{voice.speaking===turn.id?<Square size={15}/>:<Volume2 size={16}/>} {voice.speaking===turn.id?'Stop audio':'Listen'}</button>{turn.answer.source&&<a href={turn.answer.source.url} target="_blank" rel="noopener noreferrer">{turn.answer.source.label}<ArrowUpRight size={14}/></a>}</div>
            {turn.answer.topic&&['demand','structure','confirmation'].includes(turn.answer.topic)?<div className="atlas-inline-practice"><AtlasExample topic={turn.answer.topic as VisualTopic} active={open} onInteract={voice.stop}/></div>:(practiceId===turn.id || turn.choice!==undefined)&&<Practice turn={turn} onChoice={choice=>save(turns.map(t=>t.id===turn.id?{...t,choice}:t))}/>}
          </article>
        </div>)}
        {latest&&(latest.answer.topic||latest.answer.check)&&!pending&&<div className="atlas-followups"><button onClick={()=>send('Make it simpler')}>Make it simpler</button><button onClick={()=>send('Go deeper')}>Go deeper</button>{!['demand','structure','confirmation'].includes(latest.answer.topic||'')&&practiceId!==latest.id&&latest.choice===undefined&&<button className="atlas-practice-button" onClick={()=>setPracticeId(latest.id)}>Let me try <ChevronRight size={15}/></button>}</div>}
        {latest?.answer.link&&<button className="atlas-lesson-link" onClick={()=>go(latest.answer.link!.path)}><BookOpen size={18}/><span>{latest.answer.link.label}<small>Continue inside Vault</small></span><ArrowUpRight size={18}/></button>}
      </div>}
      {pending&&<div className="atlas-pending" role="status"><span>Working through your question…</span><button onClick={cancel}>Cancel</button></div>}
      <div ref={end}/>
    </div>
    <footer className="atlas-footer">
      {(voice.error||notice)&&<p role="status" className="atlas-notice">{voice.error||notice}</p>}
      <form onSubmit={e=>{e.preventDefault();send(input);}} className="atlas-composer"><label htmlFor="atlas-question" className="sr-only">Ask Atlas a question</label><textarea id="atlas-question" ref={inputRef} value={input} disabled={!!pending} onChange={e=>setInput(e.target.value)} placeholder={connected?'What would you like to work through?':'Try demand, options, risk, or trading setup…'} maxLength={1000} rows={1} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send(input);}}}/><button type="submit" disabled={!input.trim()||!!pending} aria-label="Send question"><ArrowUp size={21}/></button></form>
      <div className="atlas-footnote"><span>AI mentor concept. Not a human or a signal service.</span><span>Saved in this tab only</span></div>
    </footer>
  </DialogContent></Dialog>;
}
