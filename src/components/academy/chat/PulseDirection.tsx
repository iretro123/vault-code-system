import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import "./pulse-direction.css";

export function PulseDirection({side}:{side:"supply"|"demand"}) {
  const bearish=side==="supply";
  return <span className="pulse-direction" data-side={side} role="img" aria-label={bearish ? "Bearish supply · Watch for rejection" : "Bullish demand · Watch for a bounce"}>
    <span className="pulse-direction-animal" aria-hidden="true">{bearish ? "🐻" : "🐂"}</span>
    {bearish ? <ArrowDownRight size={24} strokeWidth={3} aria-hidden="true"/> : <ArrowUpRight size={24} strokeWidth={3} aria-hidden="true"/>}
  </span>;
}
