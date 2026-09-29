import type { PulsePost } from "@/lib/spxPulse";

export function PulseCandleChart({ post }: { post: PulsePost }) {
  const bars = post.bars?.slice(-18);
  if (!bars?.length || post.lower === undefined || post.upper === undefined) return null;
  const top = Math.max(post.upper, ...bars.map(b => b.h));
  const bottom = Math.min(post.lower, ...bars.map(b => b.l));
  const pad = Math.max((top - bottom) * .12, 1);
  const max = top + pad, min = bottom - pad;
  const y = (price: number) => 28 + (max - price) / (max - min) * 290;
  const step = 670 / bars.length;
  const x = (index: number) => 35 + step * (index + .5);
  const color = post.side === "supply" ? "#e75a6d" : "#71e7a1";
  const broken = post.kind === "broken";
  const price = (n: number) => n.toLocaleString("en-US", {minimumFractionDigits:1, maximumFractionDigits:2});
  const time = (n: number) => new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"2-digit"}).format(n);
  return <div className="pulse-data-chart">
    <svg viewBox="0 0 900 370" role="img" aria-label={`SPX500 ${post.timeframe} minute chart from indicator candle data. ${post.side} low ${post.lower}, high ${post.upper}.`}>
      <rect width="900" height="370" fill="#121922"/>
      {[0,1,2,3,4].map(i=>{const value=min+(max-min)*i/4;return <g key={i}><line x1="24" x2="875" y1={y(value)} y2={y(value)} stroke="#ffffff0b"/><text x="880" y={y(value)-5} textAnchor="end" fill="#8593a3" fontSize="12">{price(value)}</text></g>;})}
      <rect x="24" y={y(post.upper)} width="720" height={Math.max(2,y(post.lower)-y(post.upper))} fill={color} fillOpacity={broken ? .06 : .13}/>
      {[post.lower,post.upper].map((value,i)=><g key={i}><line x1="24" x2="750" y1={y(value)} y2={y(value)} stroke={color} strokeDasharray={broken ? "5 4" : undefined}/><rect x="748" y={y(value)-10} width="116" height="21" rx="4" fill={post.side === "supply" ? "#55232f" : "#16402b"}/><text x="806" y={y(value)+4} textAnchor="middle" fill="white" fontSize="12">{i===0 ? "LOW" : "HIGH"} {price(value)}</text></g>)}
      {bars.map((b,i)=>{const c=b.c>=b.o ? "#74dca6" : "#ed6c7f";return <g key={b.t}><line x1={x(i)} x2={x(i)} y1={y(b.h)} y2={y(b.l)} stroke={c}/><rect x={x(i)-step*.28} y={Math.min(y(b.o),y(b.c))} width={step*.56} height={Math.max(1.5,Math.abs(y(b.o)-y(b.c)))} rx="1" fill={c}/></g>;})}
      {[0,Math.floor(bars.length/2),bars.length-1].map((i,k)=><text key={k} x={x(i)} y="345" textAnchor={k===0 ? "start" : k===2 ? "end" : "middle"} fill="#96a5b7" fontSize="12">{time(bars[i].t)}</text>)}
      <text x="26" y="18" fill="#b5c2cf" fontSize="11">SPX500 · {post.timeframe}m · Capital.com</text>
      {broken && <text x="740" y="18" textAnchor="end" fill="#ffc795" fontSize="11">ZONE BROKEN</text>}
    </svg>
    <div className="pulse-chart-caption"><span>Drawn from your indicator’s candle data</span><span>Chart as of {time(post.closedAt ?? post.at)} ET</span></div>
  </div>;
}
