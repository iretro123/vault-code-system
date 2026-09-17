import {useEffect,useState} from 'react';
import {ArrowUpRight,Check} from 'lucide-react';
import {dailyChartStudy,studyDay} from './dailyStudyEngine';

export default function DailyChartStudy(){
  const [day,setDay]=useState(()=>studyDay());
  const [revealedDay,setRevealedDay]=useState<string|null>(null);
  useEffect(()=>{
    const check=()=>setDay(studyDay());
    const timer=setInterval(check,1000);
    window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
    return()=>{clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
  },[]);
  const study=dailyChartStudy(day),reveal=revealedDay===day;
  const max=Math.max(...study.candles.map(c=>c.high)),min=Math.min(...study.candles.map(c=>c.low));
  const x=(i:number)=>30+i*440/(study.candles.length-1),y=(v:number)=>40+(max-v)/(max-min)*176;
  return <section className="tc-challenge" aria-label="Daily quick chart study" data-study-id={study.id}>
    <div className="tc-challenge-heading"><span className="tc-pill">QUICK CHART STUDY</span><span title="Changes at midnight America/New_York">New daily · 12 AM ET</span></div>
    <h3>{study.question}</h3><p aria-live="polite">{reveal?study.answer:study.hint}</p>
    <svg className="tc-chart" viewBox="0 0 500 270" role="img" aria-label={`${study.provenance}. ${study.topic}. ${reveal?study.answer:study.hint}`}>
      <g stroke="#ffffff0d">{[45,90,135,180,225].map(v=><path key={v} d={`M20 ${v}H485`}/>)}</g>
      {reveal&&study.marks.map((m,i)=><g key={i} data-testid="daily-study-mark">{m.kind==='zone'?<rect x={x(m.first)-8} y={y(m.high)} width={x(m.last)-x(m.first)+16} height={Math.max(2,y(m.low)-y(m.high))} fill="#8fc9ff18" stroke="#a5ceff" strokeWidth="1.2"/>:<><line x1={x(m.first)} x2={x(m.last)} y1={y(m.high)} y2={y(m.high)} stroke="#bed0ff" strokeWidth="1.5" strokeDasharray="4 4"/><circle cx={x(m.first)} cy={y(m.high)} r="3" fill="#bed0ff"/></>}<text x="250" y="240" textAnchor="middle" fill="#bdd9ff" fontSize="13">{m.label}</text></g>)}
      {study.candles.map((c,i)=>{const color=c.close>=c.open?'#83ecc1':'#ee8298';return <g key={i} data-testid="daily-study-candle" stroke={color} fill={color}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)}/><rect x={x(i)-5} y={y(Math.max(c.open,c.close))} width="10" height={Math.max(2,Math.abs(y(c.open)-y(c.close)))} rx="1"/></g>;})}
      <text x="25" y="263" fill="#9da9bf" fontSize="12">SIMULATED · {day} · NOT A SIGNAL</text>
    </svg>
    <button onClick={()=>setRevealedDay(reveal?null:day)} className="tc-reveal">{reveal?<><Check size={18}/> Hide explanation</>:<>Show me the answer <ArrowUpRight size={18}/></>}</button>
  </section>;
}
