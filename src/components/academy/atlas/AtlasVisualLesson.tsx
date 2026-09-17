import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Check, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import './atlas-visual-lesson.css';

export type LessonOutcome='bounce'|'failure';
type Phase='ready'|'departure'|'mark'|'return'|'observe'|'response'|'complete';
const shared=[103,102,101,100.4,100.8,100.5,100.9,101.3,103.2,105.3,106.8,106.1,105,103.8,102.5,101.5,100.9,100.6];
export const makeLessonCandles=(outcome:LessonOutcome)=>[...shared,...(outcome==='bounce'?[101.4,102.8,104.5,106,107.5,108.3]:[100.1,99.4,98.7,99.1,98.5,98])].map((close,i,closes)=>{const open=i?closes[i-1]:103.5;return {open,close,high:Math.max(open,close)+.25,low:Math.min(open,close)-.25};});
export const lessonZone={first:3,last:6,low:100.15,high:101.25};
export function isDemandMark(index:number,price:number){return index>=lessonZone.first && index<=lessonZone.last && price>=lessonZone.low-.55 && price<=lessonZone.high+.55;}
export function lessonCaption(phase:Phase,outcome:LessonOutcome){
  switch(phase){
    case 'ready':return {title:'Find the origin. Not the top.',text:'Watch the candles form, then mark the base before the strong move. The lesson pauses for you.'};
    case 'departure':return {title:'Watch what price moves away from.',text:'The small base comes first. Then price pushes up and closes above the earlier high.'};
    case 'mark':return {title:'Your turn. Tap the base on the chart.',text:'Mark the small cluster where the rally began—not the green candles at the top.'};
    case 'return':return {title:'Keep your eyes on the same area.',text:'Your zone stays in place. Follow price as it comes back toward the base.'};
    case 'observe':return {title:'A touch is not confirmation.',text:'Price has returned to demand. Pause here: we do not know the next candle yet. Watch its completed close.'};
    case 'response':return outcome==='bounce'?{title:'Now watch the response close.',text:'The green candle closes above the previous red candle’s open. That is the defined bullish response in this illustration.'}:{title:'This time, the zone does not hold.',text:'The next candle closes below the marked base. The demand idea failed in this illustration.'};
    case 'complete':return outcome==='bounce'?{title:'Base → return → response.',text:'You marked the origin, waited through the return, and saw a bullish response. Now compare a failure—the same early candles do not guarantee a bounce.'}:{title:'Same beginning. Different outcome.',text:'Price returned to the same base, then closed below it. A demand zone is an area to study, not a promise or an automatic buy.'};
  }
}

export default function AtlasVisualLesson({active=true,onExplain,onNarrate,onInteract}:{active?:boolean;onExplain?:()=>void;onNarrate?:(text:string)=>void;onInteract?:()=>void}){
  const [outcome,setOutcome]=useState<LessonOutcome>('bounce');
  const [phase,setPhase]=useState<Phase>('ready');
  const [frame,setFrame]=useState(6);
  const [playing,setPlaying]=useState(false);
  const [seconds,setSeconds]=useState<5|15>(15);
  const [cursor,setCursor]=useState(4);
  const [marked,setMarked]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [selection,setSelection]=useState<number|null>(null);
  const [reduced,setReduced]=useState(false);
  const svgRef=useRef<SVGSVGElement>(null);
  const headingId=useId();const instructionId=useId();
  const candles=makeLessonCandles(outcome);
  const caption=lessonCaption(phase,outcome);
  const x=(i:number)=>34+i*23;
  const y=(p:number)=>24+(110-p)*16;
  const runningPhase=['departure','return','response'].includes(phase);
  useEffect(()=>{const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');if(!media)return;const update=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};update();media.addEventListener?.('change',update);return()=>media.removeEventListener?.('change',update);},[]);
  useEffect(()=>{if(!active)setPlaying(false);},[active]);
  useEffect(()=>{const pauseHidden=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',pauseHidden);return()=>document.removeEventListener('visibilitychange',pauseHidden);},[]);
  const advance=()=>{
    if(phase==='departure'&&frame>=10){setFrame(11);setPhase('mark');setPlaying(false);return;}
    if(phase==='return'&&frame>=16){setFrame(17);setPhase('observe');setPlaying(false);return;}
    if(phase==='response'&&frame>=22){setFrame(23);setPhase('complete');setPlaying(false);return;}
    setFrame(f=>Math.min(23,f+1));
  };
  useEffect(()=>{
    if(!playing||!active||!runningPhase||reduced)return;
    const timer=window.setTimeout(advance,seconds*1000/17);
    return()=>window.clearTimeout(timer);
  },[playing,active,phase,frame,seconds,reduced]);
  const reset=(next:LessonOutcome=outcome)=>{onInteract?.();setOutcome(next);setPhase('ready');setFrame(6);setPlaying(false);setMarked(false);setSelection(null);setFeedback('');setCursor(4);};
  const begin=(next:Phase)=>{onInteract?.();setPhase(next);setFeedback('');setPlaying(!reduced);};
  const choose=(index:number,price:number)=>{
    if(phase!=='mark'||marked)return;
    onInteract?.();setSelection(index);setCursor(index);
    if(isDemandMark(index,price)){setMarked(true);setFeedback('That’s the origin of the move. Your zone now extends forward so you can watch the return.');}
    else setFeedback(index>=7?'You marked the move away. Go back to the small candles just before it—the base where the move started.':'Look for the small cluster after the decline, immediately before the strong green candles. Try again.');
  };
  const tap=(event:React.PointerEvent<SVGSVGElement>)=>{
    if(phase!=='mark'||marked)return;
    const matrix=svgRef.current?.getScreenCTM();if(!matrix)return;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    const index=Math.round((point.x-34)/23);if(index<0||index>frame)return;
    choose(index,110-(point.y-24)/16);
  };
  const mainAction=()=>{
    if(phase==='ready')begin('departure');
    else if(phase==='mark'&&marked)begin('return');
    else if(phase==='observe')begin('response');
    else if(phase==='complete')reset();
    else if(reduced)advance();
    else {onInteract?.();setPlaying(p=>!p);}
  };
  const label=phase==='ready'?'Play the lesson':phase==='mark'?'Watch the return':phase==='observe'?'Reveal the response':phase==='complete'?'Replay lesson':reduced?'Next candle':playing?'Pause':'Continue';
  return <section className="atlas-visual" aria-labelledby={headingId}>
    <div className="atlas-visual-top"><div><span>CHART LAB</span><h3 id={headingId}>Watch it happen.</h3></div><label className="atlas-speed">Playback<select aria-label="Chart playback duration" value={seconds} disabled={playing} onChange={e=>setSeconds(Number(e.target.value) as 5|15)}><option value={15}>15 seconds</option><option value={5}>5 seconds</option></select></label></div>
    <div className="atlas-visual-chart">
      <svg ref={svgRef} viewBox="0 0 600 244" role={phase==='mark'&&!marked?'slider':'img'} tabIndex={phase==='mark'&&!marked?0:undefined} aria-label={phase==='mark'&&!marked?'Choose a candle at the demand base. Arrow keys move, Enter marks.':'Illustrative candlestick lesson, revealed one candle at a time. Not historical market data.'} aria-valuemin={phase==='mark'?1:undefined} aria-valuemax={phase==='mark'?frame+1:undefined} aria-valuenow={phase==='mark'?cursor+1:undefined} aria-valuetext={phase==='mark'?`Candle ${cursor+1}`:undefined} aria-describedby={instructionId} onPointerDown={tap} onKeyDown={e=>{if(phase!=='mark'||marked)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setCursor(c=>Math.max(0,Math.min(frame,c+(e.key==='ArrowRight'?1:-1))));}if(e.key==='Home'){e.preventDefault();setCursor(0);}if(e.key==='End'){e.preventDefault();setCursor(frame);}if(e.key==='Enter'||e.key===' '){e.preventDefault();const candle=candles[cursor];choose(cursor,(candle.open+candle.close)/2);}}}>
        <title>Authored demand example with a base, departure, return, and an uncertain response.</title>
        {[98,101,104,107,110].map(price=><g key={price}><line x1="14" x2="575" y1={y(price)} y2={y(price)} stroke="#647eab" strokeOpacity=".16"/><text x="578" y={y(price)+4} fill="#879bbd" fontSize="11">{price}</text></g>)}
        {marked&&<rect data-testid="marked-demand-zone" x={x(3)-10} y={y(lessonZone.high)} width={x(23)-x(3)+20} height={y(lessonZone.low)-y(lessonZone.high)} fill="#8bdac219" stroke="#8bdac2" strokeWidth="1.2"/>}
        {frame>=9&&<line x1={x(0)} x2={x(9)} y1={y(candles[0].high)} y2={y(candles[0].high)} stroke="#b1c4ff" strokeDasharray="4 4"/>}
        {candles.slice(0,frame+1).map((c,i)=>{const color=c.close>=c.open?'#91e5c9':'#ef9aae';return <g key={i} data-testid="lesson-candle" data-index={i}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.7"/><rect x={x(i)-6} y={y(Math.max(c.close,c.open))} width="12" height={Math.max(2,Math.abs(y(c.close)-y(c.open)))} fill={color} rx="1.5"/></g>})}
        {phase==='mark'&&!marked&&<rect x={x(cursor)-10} y={y(candles[cursor].high)-6} width="20" height={y(candles[cursor].low)-y(candles[cursor].high)+12} fill="none" stroke="#d7e1ff" strokeDasharray="3 3" className="atlas-candle-cursor"/>}
        {selection!==null&&!marked&&<circle cx={x(selection)} cy={y((candles[selection].open+candles[selection].close)/2)} r="13" fill="none" stroke="#eab989" strokeWidth="2"/>}
        {frame>=18&&<rect x={x(17)-10} y={y(Math.max(candles[17].high,candles[18].high))-6} width="43" height={y(Math.min(candles[17].low,candles[18].low))-y(Math.max(candles[17].high,candles[18].high))+12} fill="none" stroke={outcome==='bounce'?'#bdcbff':'#f2b58e'} strokeWidth="1.5"/>}
      </svg>
      <div className="atlas-chart-legend"><span><i/> {marked?'Your demand zone':'Find the base'}</span><span>Illustrative prices · Not a signal</span></div>
    </div>
    <div className="atlas-playhead" aria-label={`Lesson progress: ${Math.round((frame-6)/17*100)} percent`}><span style={{width:`${(frame-6)/17*100}%`}}/></div>
    <div className="atlas-visual-caption" id={instructionId} aria-live="polite" aria-atomic="true"><h4>{caption.title}</h4><p>{feedback||caption.text}</p></div>
    <div className="atlas-visual-controls">
      <button className="atlas-play" onClick={mainAction} disabled={phase==='mark'&&!marked}>{phase==='complete'?<RotateCcw size={17}/>:playing?<Pause size={17}/>:phase==='mark'&&marked?<Check size={17}/>:<Play size={17}/>} {label}</button>
      {phase==='mark'&&!marked?<button className="atlas-visual-secondary" onClick={()=>{onInteract?.();setMarked(true);setFeedback('The zone starts at the small base before the rally. Follow its edges forward to see where price returns.');}}>Show me why</button>:phase==='complete'?<button className="atlas-visual-secondary" onClick={()=>reset(outcome==='bounce'?'failure':'bounce')}>Compare {outcome==='bounce'?'a failure':'a bounce'}<ArrowRight size={16}/></button>:phase!=='ready'?<button className="atlas-visual-secondary" onClick={()=>reset()} aria-label="Restart chart lesson"><RotateCcw size={16}/> Reset</button>:null}
    </div>
    <div className="atlas-visual-bottom"><span>{reduced?'Reduced motion: advance one candle at a time.':`${seconds}s of playback · pauses for practice`}</span>{onNarrate&&<button onClick={()=>{setPlaying(false);onNarrate(`${caption.title} ${feedback||caption.text}`);}}><Volume2 size={14}/> Explain aloud</button>}</div>
    {phase==='complete'&&onExplain&&<button className="atlas-visual-discuss" onClick={()=>{setPlaying(false);onExplain();}}>Talk through this example with Atlas <ArrowRight size={16}/></button>}
  </section>;
}
