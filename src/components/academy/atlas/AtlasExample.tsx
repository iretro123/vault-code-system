import {useEffect,useId,useState} from 'react';
import {ArrowRight,Pause,Play} from 'lucide-react';
import {createScenario,VisualTopic} from './atlasScenarios';
import './atlas-example.css';

export default function AtlasExample({topic,active=true,onInteract}:{topic?:VisualTopic;active?:boolean;onInteract?:()=>void}){
  const [serial,setSerial]=useState(()=>Math.floor(Math.random()*100000));
  const [revealed,setRevealed]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [frame,setFrame]=useState(14);
  const id=useId();
  const effectiveTopic=topic||(['demand','structure','confirmation'] as const)[serial%3];
  const scenario=createScenario(effectiveTopic,topic?serial:Math.floor(serial/3)),{candles,base,level,breakIndex}=scenario;
  const low=Math.min(...candles.map(c=>c.low)),high=Math.max(...candles.map(c=>c.high));
  const range=high-low;
  const x=(i:number)=>24+i*(570/(candles.length-1));
  const y=(price:number)=>40+(high-price)/range*218;
  const next=()=>{onInteract?.();setSerial(n=>n+1);setRevealed(false);setFrame(14);setPlaying(false);};
  useEffect(()=>{setRevealed(false);setFrame(14);setPlaying(false);},[topic]);
  useEffect(()=>{if(!active)setPlaying(false);},[active]);
  useEffect(()=>{const pause=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',pause);return()=>document.removeEventListener('visibilitychange',pause);},[]);
  useEffect(()=>{
    if(!playing||!active)return;
    if(frame>=candles.length-1){setPlaying(false);return;}
    const timer=setTimeout(()=>setFrame(f=>f+1),600);
    return()=>clearTimeout(timer);
  },[playing,active,frame,candles.length]);
  const act=()=>{
    onInteract?.();
    if(!revealed){setRevealed(true);if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)setFrame(candles.length-1);else setPlaying(true);}
    else if(frame<candles.length-1)setPlaying(v=>!v);
    else next();
  };
  const done=frame>=candles.length-1;
  return <section className="atlas-example-stage" aria-labelledby={id}>
    <div className="atlas-example-kicker">{effectiveTopic==='structure'?'READ THE STRUCTURE':effectiveTopic==='confirmation'?'READ THE RESPONSE':'FIND THE ORIGIN'}<span>Simulated example</span></div>
    <h3 id={id}>{scenario.title}</h3>
    <div className="atlas-example-canvas">
      <svg viewBox="0 0 654 296" role="img" aria-label={`${scenario.title}. ${revealed&&done?scenario.explanation:scenario.prompt}`}>
        {[0,.25,.5,.75,1].map(n=><g key={n}><line x1="12" x2="604" y1={40+n*218} y2={40+n*218} stroke="#ffffff" strokeOpacity=".065"/><text x="613" y={45+n*218} fill="#8897ad" fontSize="12">{(high-n*range).toFixed(1)}</text></g>)}
        {revealed&&base&&<g className="atlas-annotation"><rect data-testid="example-zone" x={x(base.first)-10} y={y(base.high)} width={x(candles.length-1)-x(base.first)+20} height={y(base.low)-y(base.high)} fill="#71c7af18" stroke="#71c7af" strokeWidth="1"/><text x={x(base.first)} y={y(base.low)+18} fill="#a1e2ce" fontSize="13">Demand · origin of the move</text></g>}
        {revealed&&level!==undefined&&breakIndex!==undefined&&breakIndex>=0&&<g className="atlas-annotation"><line data-testid="example-swing" x1={x(scenario.swing!)} x2={x(breakIndex)} y1={y(level)} y2={y(level)} stroke="#b7c7ff" strokeWidth="1.5" strokeDasharray="5 4"/><circle cx={x(scenario.swing!)} cy={y(level)} r="4" fill="#b7c7ff"/><text x={x(scenario.swing!)-18} y={y(level)+(scenario.mirror?23:-13)} fill="#bdccff" fontSize="13">{scenario.mirror?'Swing low':'Swing high'}</text><rect x={x(breakIndex)-10} y={y(candles[breakIndex].high)-5} width="20" height={y(candles[breakIndex].low)-y(candles[breakIndex].high)+10} rx="3" fill="#b7c7ff12" stroke="#b7c7ff"/></g>}
        {candles.slice(0,frame+1).map((c,i)=><g key={`${serial}:${i}`} data-testid="example-candle" className={i>14?'atlas-fresh-candle':''}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={c.close>=c.open?'#90dcc3':'#dc91a4'} strokeWidth="1.5"/><rect x={x(i)-6} y={y(Math.max(c.open,c.close))} width="12" height={Math.max(2,Math.abs(y(c.open)-y(c.close)))} rx="1" fill={c.close>=c.open?'#90dcc3':'#dc91a4'}/></g>)}
        {revealed&&scenario.response!==undefined&&frame>=scenario.response&&<g className="atlas-annotation"><rect data-testid="example-response" x={x(scenario.response)-11} y={y(candles[scenario.response].high)-7} width="22" height={y(candles[scenario.response].low)-y(candles[scenario.response].high)+14} rx="3" fill="none" stroke="#efce8e" strokeWidth="1.6"/><text x={Math.min(x(scenario.response)-30,490)} y={Math.max(19,y(candles[scenario.response].high)-18)} fill="#efce8e" fontSize="13">Watch this close</text></g>}
      </svg>
    </div>
    <p className="atlas-example-insight" aria-live="polite">{revealed?(done?scenario.explanation:'Follow the next candles. The outcome is still unfolding.'):scenario.prompt}</p>
    <button className="atlas-example-action" onClick={act}>{!revealed?'Show me what matters':done?'Another example':playing?'Pause':'Continue'}{playing?<Pause size={17}/>:revealed&&!done?<Play size={17}/>:<ArrowRight size={18}/>}</button>
  </section>;
}
