// Authored teaching candles: a base, departure, retest and response.
// Y coordinates run downward; a lower close is a bullish candle.
const closes = [160,148,157,179,190,187,191,184,152,119,92,101,118,141,163,182,188,166,133,102,75,53];
export default function DemandStudyChart({ reveal }: { reveal: boolean }) {
  return <svg className="tc-chart" viewBox="0 0 500 270" role="img" aria-label={reveal ? "Illustrative chart: demand is the small base before a strong rally. Price later returns to that zone and bounces. Not live market data." : "Illustrative chart with a small base, a rally, a pullback and a second rally. Find the demand zone."}>
    <g stroke="#ffffff0d">{[45,90,135,180,225].map(y=><path key={y} d={`M20 ${y}H485`}/>)}{[40,120,200,280,360,440].map(x=><path key={x} d={`M${x} 20V245`}/>)}</g>
    {reveal && <g><rect x="115" y="178" width="274" height="19" fill="#80edc016" stroke="#80edc0" strokeOpacity=".65"/><rect x="115" y="178" width="77" height="19" fill="#80edc01b"/><line x1="192" x2="192" y1="178" y2="197" stroke="#80edc0" strokeDasharray="2 3"/></g>}
    {closes.map((close,i)=>{const open=i?closes[i-1]:151, cx=38+i*21, color=close<open?'#83ecc1':'#ee8298'; return <g key={i} fill={color} stroke={color}><line x1={cx} x2={cx} y1={Math.min(open,close)-6} y2={Math.max(open,close)+6}/><rect x={cx-5} y={Math.min(open,close)} width="10" height={Math.max(3,Math.abs(close-open))} rx="1.3"/></g>})}
    {reveal && <g fontFamily="sans-serif" fontSize="13" fontWeight="500">
      <path d="M150 201V218" fill="none" stroke="#a8f3d4"/><text x="150" y="234" textAnchor="middle" fill="#a8f3d4">Demand base</text>
      <path d="M226 126L207 98" fill="none" stroke="#bbcdf5"/><text x="200" y="90" textAnchor="middle" fill="#bbcdf5">Move away</text>
      <path d="M368 201V218" fill="none" stroke="#a8f3d4"/><text x="368" y="234" textAnchor="middle" fill="#a8f3d4">Return + response</text>
    </g>}
    <text x="25" y="264" fill="#9da9bf" fontSize="12">ILLUSTRATIVE STUDY · NOT A LIVE PRICE FEED</text>
  </svg>;
}
