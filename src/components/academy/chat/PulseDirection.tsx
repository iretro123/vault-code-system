import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import "./pulse-direction.css";

/** Inline vectors stay legible in native WebViews without depending on emoji fonts. */
function MarketAnimal({ bearish }: { bearish: boolean }) {
  return <svg className="pulse-direction-animal" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {bearish ? <>
      <path d="M7 12C1 12 2 3 7 4c3 0 4 3 3 5M25 12c6 0 5-9 0-8-3 0-4 3-3 5" fill="currentColor" fillOpacity=".18"/>
      <path d="M26 18c0 7-4 11-10 11S6 25 6 18C6 10 10 7 16 7s10 3 10 11Z" fill="currentColor" fillOpacity=".12"/>
      <path d="m10 15 3 1m9-1-3 1" strokeWidth="2.3"/>
      <ellipse cx="16" cy="23" rx="5" ry="4" fill="currentColor" fillOpacity=".16"/>
      <path d="m14 21 2 2 2-2Z" fill="currentColor"/>
      <path d="M16 23v2"/>
    </> : <>
      <path d="M10 12C4 12 2 8 3 3c2 4 4 5 8 5m11 4c6 0 8-4 7-9-2 4-4 5-8 5" fill="currentColor" fillOpacity=".18"/>
      <path d="m7 14-4-2 2 5 3 1m17-4 4-2-2 5-3 1"/>
      <path d="M8 14c0-5 3-7 8-7s8 2 8 7l-3 11H11Z" fill="currentColor" fillOpacity=".12"/>
      <path d="m11 15 3 1m7-1-3 1" strokeWidth="2.3"/>
      <rect x="10" y="21" width="12" height="8" rx="4" fill="currentColor" fillOpacity=".18"/>
      <path d="M13 25h.1M19 25h.1" strokeWidth="2.5"/>
    </>}
  </svg>;
}

export function PulseDirection({side}:{side:"supply"|"demand"}) {
  const bearish=side==="supply";
  return <span className="pulse-direction" data-side={side} role="img" aria-label={bearish ? "Bearish supply · Watch for rejection" : "Bullish demand · Watch for a bounce"}>
    <MarketAnimal bearish={bearish}/>
    {bearish ? <ArrowDownRight size={24} strokeWidth={3} aria-hidden="true"/> : <ArrowUpRight size={24} strokeWidth={3} aria-hidden="true"/>}
  </span>;
}
