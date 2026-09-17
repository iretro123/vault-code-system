import { useState } from "react";
import { Maximize2, ZoomIn, ZoomOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "./chart-classroom.css";

// Deliberately authored teaching data, not historical prices or a trade signal.
const closes = [100,101.2,100.7,102.4,103.8,102.9,104.5,106,105.1,107.6,109.3,110.1,109,107.8,107,107.5,106.9,107.8,109.1,110.4,111.2,113,112.5,114.2,115.1,114.4,113.2,112.6,113,111.5,110.3,109.2,108,106.9,108.2,110.4,111.8,111.2,113.5,115.3,114.6,116.2,118,117.5,119.8,121,120.3,123];
export const teachingCandles = closes.map((close, i) => {
  const open = i ? closes[i - 1] : 99.4;
  return { open, close, high: Math.max(open, close) + [0.45,0.65,0.3][i % 3], low: Math.min(open, close) - [0.35,0.5,0.25][i % 3] };
});
export const structureSwing = { highIndex: 12, lowIndex: 16, breakIndex: 20, high: teachingCandles[12].high, low: teachingCandles[16].low };
const topics = [
  { title: "Structure break", short: "Structure", color: "#a6bdff", range: [7,24], box: [structureSwing.highIndex,structureSwing.low,structureSwing.lowIndex,structureSwing.high], headline: "Higher high. Higher low. Then the break.", copy: "The blue box connects the higher high (HH) to the following higher low (HL), using their wick extremes. Follow the dashed line from that high to the first candle that closes above it: that is the break of structure (BOS).", look: "HH → HL → close above HH. The box marks the swing; the dashed line marks the break.", caution: "A break can fail. It does not make every pullback a buy." },
  { title: "Demand zone", short: "Demand", color: "#79dfc8", range: [12,38], box: [14,106.3,35.8,108.2], headline: "Mark the base that came before the strong move.", copy: "The green box starts at the small base before price moves up and breaks structure. It extends to the later return. Traders study this area for a possible buying response; the candles alone do not prove unfilled orders exist.", look: "Connect the base, the move away and the return to the same area.", caution: "These are illustrative zone boundaries. A zone can be traded through." },
  { title: "Confirmation", short: "Confirmation", color: "#efc77d", range: [31,37], box: [32.55,106.35,34.55,108.2], headline: "The return. The response. The close.", copy: "Price returns to demand. The green candle then closes above the red candle’s open. That completed bullish response is the confirmation shown here—not simply touching the zone.", look: "Amber box: the two candle bodies. Dashed line: the red candle’s open.", caution: "This example rallies afterward. Confirmation can still fail." },
] as const;
const x = (i: number) => 44 + i * 18.8;
const y = (price: number) => 354 - (price - 98) * 11.5;

function Chart({ active, onSelect, detail = false }: { active: number; onSelect: (n: number) => void; detail?: boolean }) {
  const start = detail ? topics[active].range[0] : 0;
  const end = detail ? topics[active].range[1] : 48;
  const viewX = detail ? x(start) - 12 : 0;
  const viewWidth = detail ? (end - start) * 18.8 + 40 : 1000;
  const visible = teachingCandles.slice(start,end);
  const top = detail ? y(Math.max(...visible.map(c=>c.high))) - 28 : 22;
  const height = detail ? y(Math.min(...visible.map(c=>c.low))) + 38 - top : 370;
  return <svg className="classroom-svg" viewBox={`${viewX} ${top} ${viewWidth} ${height}`} aria-label="Illustrative uptrend: structure breaks, price returns to demand, then a bullish confirmation precedes a rally">
    <title>Structure, demand and confirmation — synthetic teaching example</title>
    {[100,105,110,115,120,125].map(p => <g key={p}><line x1="20" x2="958" y1={y(p)} y2={y(p)} stroke="#8297bf" strokeOpacity=".12"/><text x="962" y={y(p)+4} fill="#8192ae" fontSize="12">{p}</text></g>)}
    {teachingCandles.map((c, i) => {if(detail && (i<start || i>=end)) return null; const cx=x(i), color=c.close>=c.open?"#72ddbe":"#e38c9e"; return <g key={i} data-candle={i} opacity={detail && active===2 && i!==33 && i!==34?.55:1}><line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.3"/><rect x={cx-5} y={y(Math.max(c.open,c.close))} width="10" height={Math.max(1.6,Math.abs(y(c.open)-y(c.close)))} rx="1" fill={color}/></g>})}
    <g pointerEvents="none" fill="#c1d0ff" stroke="#a6bdff">
      <path d={`M ${x(8)} ${y(teachingCandles[8].low)} L ${x(12)} ${y(structureSwing.high)} L ${x(16)} ${y(structureSwing.low)}`} fill="none" strokeOpacity=".6" strokeWidth="1.3"/>
      <line data-structure-break="true" x1={x(12)} x2={x(20)} y1={y(structureSwing.high)} y2={y(structureSwing.high)} strokeDasharray="5 5" strokeWidth="1.5"/>
      <circle cx={x(12)} cy={y(structureSwing.high)} r="3"/><circle cx={x(16)} cy={y(structureSwing.low)} r="3"/>
      <circle cx={x(20)} cy={y(teachingCandles[20].close)} r="4" fill="none" strokeWidth="1.5"/>
      <text x={x(12)-20} y={y(structureSwing.high)-10} stroke="none" fontSize="13" fontWeight="600">HH</text>
      <text x={x(16)-6} y={y(structureSwing.low)+20} stroke="none" fontSize="13" fontWeight="600">HL</text>
      <text x={x(20)+9} y={y(teachingCandles[20].close)-8} stroke="none" fontSize="13" fontWeight="600">BOS</text>
    </g>
    {topics.map((t,i)=>{const [left,low,right,high]=t.box; return <g key={t.title} role="button" tabIndex={0} aria-label={`Explore ${t.title}`} aria-pressed={active===i} onClick={()=>onSelect(i)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(i);}}} className="classroom-region">
      <rect x={x(left)} y={y(high)} width={x(right)-x(left)} height={y(low)-y(high)} fill={t.color} fillOpacity={active===i?.17:.06} stroke={t.color} strokeWidth={active===i?2.4:1.3} vectorEffect="non-scaling-stroke"/>
      {!detail && <><line x1={x(left)+10} x2={x(left)+10} y1={y(high)} y2={i===2?y(low)+36:y(high)-28} stroke={t.color}/><rect x={x(left)-3} y={i===2?y(low)+27:y(high)-53} width={i===0?148:i===1?118:150} height="27" rx="6" fill="#152137" stroke={t.color} strokeOpacity=".55"/><text x={x(left)+7} y={i===2?y(low)+45:y(high)-35} fill={t.color} fontSize="13" fontWeight="600">{i+1} · {t.title}</text></>}
    </g>})}
    {detail && active===2 && <g pointerEvents="none" fontSize="6.5" fontWeight="500">
      <line x1={x(32.65)} x2={x(35.3)} y1={y(teachingCandles[33].open)} y2={y(teachingCandles[33].open)} stroke="#efc77d" strokeDasharray="2 2" strokeWidth=".65"/>
      <path d={`M ${x(33)} ${y(teachingCandles[33].low)+2} L ${x(33)} ${y(105.25)}`} fill="none" stroke="#efc77d" strokeWidth=".7"/>
      <text x={x(33)} y={y(105.25)+8} textAnchor="middle" fill="#efc77d">Return into demand</text>
      <path d={`M ${x(34)} ${y(teachingCandles[34].close)-2} L ${x(34)} ${y(109.1)} L ${x(32.4)} ${y(109.1)}`} fill="none" stroke="#9bf0d5" strokeWidth=".7"/>
      <text x={x(32.3)} y={y(109.1)+2} textAnchor="end" fill="#9bf0d5">Bullish close</text>
      <text x={x(35.3)} y={y(106.05)} fill="#79dfc8">Demand</text>
    </g>}
    {!detail && <text x="44" y="382" fill="#8192ae" fontSize="12">Earlier candles</text>}
    {!detail && <text x="843" y="382" fill="#8192ae" fontSize="12">Later candles →</text>}
  </svg>;
}

export default function ChartClassroom() {
  const [active,setActive] = useState(0);
  const [open,setOpen] = useState(false);
  const [detail,setDetail] = useState(false);
  const select = (n:number) => {setActive(n);setDetail(true);setOpen(true);};
  const topic=topics[active];
  return <section className="chart-classroom" aria-labelledby="classroom-heading">
    <header><p className="learn-eyebrow">SEE WHAT YOU’LL LEARN</p><h2 id="classroom-heading">One chart. Three things to see.</h2><p>Structure. Demand. Confirmation. Tap a highlighted area to connect the dots.</p></header>
    <div className="classroom-stage">
      <div className="classroom-toolbar"><span>UPTREND STUDY <small>Illustrative · not a live signal</small></span><Button variant="ghost" onClick={()=>{setDetail(false);setOpen(true);}}><Maximize2 size={16}/> Explore chart</Button></div>
      <div className="classroom-chart-scroll"><Chart active={active} onSelect={select}/></div>
      <p className="classroom-mobile-hint">Swipe the chart to explore. Tap a box for details.</p>
      <div className="classroom-choices">{topics.map((t,i)=><button key={t.title} onClick={()=>select(i)} style={{"--topic-color":t.color} as React.CSSProperties}><span>0{i+1}</span><strong>{t.short}</strong><ArrowRight size={16}/></button>)}</div>
    </div>
    <p className="classroom-caption">A teaching example with a successful outcome. Real setups can fail—even after confirmation.</p>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="classroom-dialog">
      <DialogTitle>{topic.title}</DialogTitle><DialogDescription>Zoom into the same candles and swing points. Illustrative teaching chart.</DialogDescription>
      <div className="classroom-detail-controls"><div>{topics.map((t,i)=><Button key={t.title} variant="ghost" aria-pressed={active===i} onClick={()=>setActive(i)}>{i+1}. {t.short}</Button>)}</div><Button variant="outline" onClick={()=>setDetail(v=>!v)}>{detail?<ZoomOut size={16}/>:<ZoomIn size={16}/>} {detail?"Full chart":"Zoom into candles"}</Button></div>
      <div className="classroom-chart-scroll classroom-detail-chart"><Chart active={active} onSelect={n=>{setActive(n);setDetail(true);}} detail={detail}/></div>
      <div className="classroom-explanation" aria-live="polite" style={{"--topic-color":topic.color} as React.CSSProperties}><h3>{topic.headline}</h3><p>{topic.copy}</p><p className="classroom-look">{topic.look}</p><small>{topic.caution}</small></div>
    </DialogContent></Dialog>
  </section>;
}
