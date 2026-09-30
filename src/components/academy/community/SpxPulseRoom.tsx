import { useEffect, useRef, useState } from "react";
import { Activity, ArrowUpRight, ArrowUp } from "lucide-react";
import { PulseChartPost } from "../chat/PulseChartPost";
import { ZonePulseCard } from "../chat/ZonePulseCard";
import { pulseAge, pulseWindowOpen } from "@/lib/spxPulse";
import { usePulseFeed } from "@/hooks/usePulseFeed";
import { usePulseReactions } from "@/hooks/usePulseReactions";
import "./pulse-room.css";

export function SpxPulseRoom({ source = "cloud", active = true }: { source?: "cloud" | "local"; active?: boolean }) {
  const { feed, connected, error } = usePulseFeed(source, active);
  const [tf, setTf] = useState<5 | 15>(5);
  const [now, setNow] = useState(Date.now());
  const [history, setHistory] = useState(false);
  const [arrival, setArrival] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(false);
  const known = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const symbol = feed.symbol ?? "AMEX:SPY";
  const symbolLabel = symbol.split(":").at(-1)!;
  const posts = feed.posts.filter(post => post.timeframe === tf).slice().reverse();
  const latest = posts[0];
  const quote = feed.quotes?.[tf];
  const monitoring = pulseWindowOpen(now) || now < (feed.afterHoursTestUntil || 0);
  const fresh = connected && !!quote && now >= quote.at && now - quote.at <= 90000;
  const noZone = fresh && quote.zones.length === 0;
  const closingSnapshot = !monitoring && !!quote;
  const snapshotSides = new Set(quote?.zones.map(zone => zone.side));
  const snapshotSide = snapshotSides.size === 1 ? quote!.zones[0].side : "neutral";
  const snapshotTime = quote ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(quote.at) : "";
  const shown = history ? posts : noZone || closingSnapshot ? [] : posts.slice(0, 1);
  const earlierCount = noZone || closingSnapshot ? posts.length : Math.max(0, posts.length - 1);
  const reactions = usePulseReactions(shown.map(post => post.id), active && source === "cloud");
  const inZone = quote?.zones.find(zone => quote.price >= zone.lower && quote.price <= zone.upper);
  const currentState = !fresh ? "" : inZone ? `In ${tf}m ${inZone.side}` : quote?.zones.length ? `${tf}m ${quote.zones.map(zone => zone.side).join(" + ")} on watch` : `No active ${tf}m zone`;

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const id = latest?.id ?? null;
    if (known.current && known.current !== id) {
      setArrival(id);
      if ((scroller.current?.scrollTop ?? 0) > 150) setUnseen(true);
    }
    known.current = id;
  }, [latest?.id]);
  useEffect(() => { if (!arrival) return; const timer = setTimeout(() => setArrival(null), 3000); return () => clearTimeout(timer); }, [arrival]);
  const changeTimeframe = (value: 5 | 15) => {
    setTf(value); setHistory(false); setUnseen(false); setArrival(null); known.current = null;
    scroller.current?.scrollTo({ top: 0, behavior: "instant" });
  };
  const openLatest = () => { scroller.current?.scrollTo({ top: 0, behavior: "smooth" }); setUnseen(false); };
  const liveChart = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&interval=${tf}`;

  return <section className="zone-pulse-room pulse-room-clean" aria-label={`${symbolLabel} Zone Pulse`}>
    <header className="pr-toolbar">
      <span className="pr-symbol"><Activity size={25} aria-hidden="true"/>{symbolLabel}</span>
      <div className="pr-timeframes" aria-label="Chart timeframe">{([5, 15] as const).map(value => <button key={value} type="button" aria-pressed={tf === value} onClick={() => changeTimeframe(value)}>{value} min</button>)}</div>
    </header>
    <div className="pr-scroll" ref={scroller} onScroll={event => { if (event.currentTarget.scrollTop < 80) setUnseen(false); }}>
      <div className="pr-content">
        <div className="pr-now" role="status" data-fresh={fresh && monitoring}>
          <span><i aria-hidden="true"/>{monitoring ? fresh ? "Live updates" : "Reconnecting" : "Market closed"}{quote && <b>${quote.price.toFixed(2)}</b>}</span>
          <span>{monitoring && fresh ? noZone ? "" : currentState : `Last update ${pulseAge(quote?.at, now)}`}</span>
        </div>
        {error && <p className="pr-warning" role="alert">{error}</p>}
        {monitoring && connected && !fresh && !error && <p className="pr-warning" role="alert">Waiting for fresh {tf}m data. The price and zones below may be out of date.</p>}
        {closingSnapshot && <section className="pr-snapshot" data-side={snapshotSide} aria-label={`${tf}-minute last indicator snapshot`}>
          <p className="pr-snapshot-time">Last indicator snapshot · {snapshotTime} ET</p>
          <h2 className="sr-only">{tf}-minute zones</h2>
          {quote.zones.length ? <ul>{quote.zones.map(zone => <li key={`${zone.side}:${zone.lower}:${zone.upper}`} data-side={zone.side}>
            <span className="pr-snapshot-side">{zone.side}</span><strong>${zone.lower.toFixed(2)} – ${zone.upper.toFixed(2)}</strong>
          </li>)}</ul> : <p className="pr-snapshot-none">No active {tf}-minute zone at this update.</p>}
          {quote.chartUrl && quote.chartCapturedAt && <PulseChartPost
            key={`${tf}:${quote.at}`} symbol={symbolLabel} timeframe={tf} side={snapshotSide}
            headline="TradingView chart" capturedAt={quote.at} chartCapturedAt={quote.chartCapturedAt}
            captureContext="refresh" chartUrl={quote.chartUrl} showIdentity={false}
            defaultShowChart note="Captured after the session. Zone values above are from the timestamp shown." />}
          <p className="pr-snapshot-note">Recorded indicator state. Updates resume next trading session.</p>

        </section>}
        {noZone && <div className="pr-empty pr-no-zone" role="status"><Activity size={34} strokeWidth={1.3} aria-hidden="true"/><h2>No zone yet.</h2></div>}
        {(noZone || closingSnapshot) && history && <p className="pr-history-label">Earlier updates</p>}
        <ol className="pr-posts">{shown.map((post, index) => <li key={post.id}><ZonePulseCard post={post} featured={!noZone && index === 0} arriving={post.id === arrival} reactions={reactions.forPost(post.id)} onReact={source === "cloud" ? emoji => reactions.react(post.id, emoji) : undefined} reactionsDisabled={reactions.pending}/></li>)}</ol>
        {!posts.length && !noZone && !closingSnapshot && <div className="pr-empty"><Activity size={34} strokeWidth={1.3} aria-hidden="true"/><h2>{!monitoring ? "Next session, new zones." : fresh ? "Watching for an update." : "Checking for zones…"}</h2></div>}
        <div className="pr-source">
          <a href={liveChart} target="_blank" rel="noreferrer">Open {symbolLabel} on TradingView <ArrowUpRight size={20} aria-hidden="true"/></a>
          <p role="status">{!monitoring ? "Live zone alerts resume during the next trading session." : source === "cloud" && feed.captureConnected === false ? "Zone updates are automatic · Chart capture offline" : feed.captureConnected ? "New zones and chart captures appear automatically" : "Checking chart connection…"}</p>
        </div>
        {earlierCount > 0 && <button type="button" className="pr-history" aria-expanded={history} onClick={() => setHistory(value => !value)}>{history ? "Hide earlier updates" : `Earlier updates (${earlierCount})`}</button>}
      </div>
    </div>
    {unseen && <button type="button" className="pr-new" onClick={openLatest}><ArrowUp size={16}/> New update</button>}
    <span className="sr-only" aria-live="polite">{arrival && latest ? `$${symbolLabel} ${tf} minute ${latest.side} update received.` : ""}</span>
  </section>;
}
