import { useEffect, useRef, useState } from "react";
import { Activity, ArrowUpRight, ArrowUp } from "lucide-react";
import { ZonePulseCard } from "../chat/ZonePulseCard";
import { PulseNexus } from "../chat/PulseNexus";
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
  const shown = history ? posts : posts.slice(0, 1);
  const reactions = usePulseReactions(shown.map(post => post.id), active && source === "cloud");
  const quote = feed.quotes?.[tf];
  const monitoring = pulseWindowOpen(now) || now < (feed.afterHoursTestUntil || 0);
  const fresh = connected && !!quote && now >= quote.at && now - quote.at <= 90000;
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
  const liveChart = symbol === "AMEX:SPY" ? `https://www.tradingview.com/chart/Db5ipsDu/?symbol=AMEX%3ASPY&interval=${tf}` : `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&interval=${tf}`;

  return <section className="zone-pulse-room pulse-room-clean" aria-label={`${symbolLabel} Zone Pulse`}>
    <header className="pr-toolbar">
      <span className="pr-symbol"><Activity size={25} aria-hidden="true"/>{symbolLabel}</span>
      <div className="pr-timeframes" aria-label="Chart timeframe">{([5, 15] as const).map(value => <button key={value} type="button" aria-pressed={tf === value} onClick={() => changeTimeframe(value)}>{value} min</button>)}</div>
    </header>
    <div className="pr-scroll" ref={scroller} onScroll={event => { if (event.currentTarget.scrollTop < 80) setUnseen(false); }}>
      <div className="pr-content">
        <div className="pr-now" role="status" data-fresh={fresh && monitoring}>
          <span><i aria-hidden="true"/>{monitoring ? fresh ? "Live updates" : "Reconnecting" : "Market session ended"}{quote && <b>${quote.price.toFixed(2)}</b>}</span>
          <span>{monitoring && fresh ? currentState : `Last update ${pulseAge(quote?.at, now)}`}</span>
        </div>
        {error && <p className="pr-warning" role="alert">{error}</p>}
        {monitoring && connected && !fresh && !error && <p className="pr-warning" role="alert">Waiting for fresh {tf}m data. The price and zones below may be out of date.</p>}
        <ol className="pr-posts">{shown.map((post, index) => <li key={post.id}><ZonePulseCard post={post} featured={index === 0} arriving={post.id === arrival} reactions={reactions.forPost(post.id)} onReact={source === "cloud" ? emoji => reactions.react(post.id, emoji) : undefined} reactionsDisabled={reactions.pending}/></li>)}</ol>
        {!posts.length && <div className="pr-empty"><PulseNexus moving={active}/><h3>{fresh ? `No active ${tf}m zone.` : "Waiting for your next update."}</h3></div>}
        <div className="pr-source">
          <a href={liveChart} target="_blank" rel="noreferrer">Open live chart <ArrowUpRight size={20} aria-hidden="true"/></a>
          <p role="status">{source === "cloud" && feed.captureConnected === false ? "Zone updates are automatic · Chart capture offline" : feed.captureConnected ? "New zones and chart captures appear automatically" : "Checking chart connection…"}</p>
        </div>
        {posts.length > 1 && <button type="button" className="pr-history" aria-expanded={history} onClick={() => setHistory(value => !value)}>{history ? "Show latest only" : `Earlier updates (${posts.length - 1})`}</button>}
      </div>
    </div>
    {unseen && <button type="button" className="pr-new" onClick={openLatest}><ArrowUp size={16}/> New update</button>}
    <span className="sr-only" aria-live="polite">{arrival && latest ? `$${symbolLabel} ${tf} minute ${latest.side} update received.` : ""}</span>
  </section>;
}
