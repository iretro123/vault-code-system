import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, Expand, ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { pulseHeadline, type PulsePost } from "@/lib/spxPulse";
import "./zone-pulse.css";
import { PulseCandleChart } from "./PulseCandleChart";

export function PulseOrb({ active = false }: { active?: boolean }) {
  return <span aria-hidden="true" className={`pulse-orb ${active ? "pulse-orb-active" : ""}`}><span/><i/></span>;
}

export function ZonePulseCard({ post, featured = true, arriving = false, showIdentity = true }: { post: PulsePost; featured?: boolean; arriving?: boolean; showIdentity?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [showChart, setShowChart] = useState(featured);
  useEffect(() => { setShowChart(featured); }, [featured]);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(post.at);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }).format(post.at);
  const closeTime = post.closedAt ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(post.closedAt) : time;
  const caughtUp = post.confirmed && post.closedAt !== undefined && post.at - post.closedAt > 90000;
  const imageOk = !!post.chartUrl && (/^\/api\/spx-pulse\/image\/[a-zA-Z0-9:_-]+$/.test(post.chartUrl) || /^https:\/\//.test(post.chartUrl));
  const hasLevels = (post.source === "indicator" || post.levelsSource === "indicator-labels") && post.lower !== undefined && post.upper !== undefined;
  const priceFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return <article className={`zone-pulse-post ${featured ? "pulse-featured" : "pulse-previous"} ${arriving ? "pulse-arriving" : ""}`} data-side={post.side} data-kind={post.kind}>
    {showIdentity && <div className="pulse-author"><PulseOrb active={arriving}/><div><div className="pulse-author-name">Vault AI <span>ZONE PULSE</span></div><time dateTime={new Date(post.at).toISOString()}>{date} · {time} ET</time></div></div>}
    <div className="pulse-post-body">
      <div className="pulse-callout"><div className="pulse-call-meta"><span>$SPX500</span><span className="pulse-timeframe">{post.timeframe}m</span><span className="pulse-side">{post.side}</span>{post.kind === "broken" && <span className="pulse-event-state">Broken</span>}{featured && <ScanLine size={16} aria-hidden="true"/>}</div>
        <h3>{pulseHeadline(post)}</h3>
        <div className="pulse-evidence"><span className="pulse-evidence-dot"/>{post.confirmed ? "Candle closed" : post.source === "chart-review" ? "Chart checked" : "Candle forming"}<span>·</span><span>{post.confirmed ? closeTime : time} ET</span></div>
        {caughtUp && <p className="pulse-catch-up">Earlier move · Added after the feed caught up.</p>}
        {hasLevels && <div className="pulse-zone-range" aria-label={`Exact ${post.side} zone boundaries`}>
          <div><span>Zone low</span><strong>{priceFormat.format(post.lower!)}</strong></div>
          <span className="pulse-range-link" aria-hidden="true"><i/><i/></span>
          <div><span>Zone high</span><strong>{priceFormat.format(post.upper!)}</strong></div>
          <small>Drawn from the source candle’s low and high.</small>
        </div>}
      </div>
      {imageOk && <div className="pulse-chart-container">
        <button type="button" className="pulse-chart-heading" aria-expanded={showChart} onClick={() => setShowChart(v => !v)}><span><ScanLine size={14}/> The chart behind the call</span><ChevronDown size={16} className={showChart ? "pulse-chevron-open" : ""}/></button>
        {showChart && <><button type="button" className="pulse-chart-image" aria-label={`Expand SPX500 ${post.timeframe}-minute chart`} onClick={() => setExpanded(true)}><img src={post.chartUrl} alt={`Original TradingView CAPITALCOM:SPX500 ${post.timeframe}-minute supply and demand chart captured ${time} ET`} loading="lazy"/><span className="pulse-expand"><Expand size={15}/> Open original</span></button><div className="pulse-chart-caption"><span>Capital.com · TradingView</span><span>Snapshot · {time} ET</span></div></>}
      </div>}
      {!imageOk && (post.bars?.length ? <PulseCandleChart post={post}/> : <p className="pulse-no-chart">Chart snapshot pending</p>)}
      {featured && !hasLevels && <div className="pulse-post-foot"><span className="pulse-small-mark">✦</span><span>{post.source === "chart-review" ? "Your original indicator. Original chart." : "From your indicator."}</span><ArrowUpRight size={15}/></div>}
    </div>
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-w-5xl border-white/10 bg-[#171d27] text-slate-100"><DialogTitle>SPX500 · {post.timeframe}m · Original chart</DialogTitle><DialogDescription className="text-slate-400">Captured {date}, {time} ET. This is a snapshot.</DialogDescription><img src={post.chartUrl} alt={`Complete original ${post.timeframe}-minute SPX500 chart`} className="max-h-[72dvh] w-full object-contain"/></DialogContent></Dialog>
  </article>;
}
