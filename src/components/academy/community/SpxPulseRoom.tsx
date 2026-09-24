import { useEffect, useRef, useState } from "react";
import { Activity, Pause, Play, RotateCcw } from "lucide-react";
import { PulseOrb, ZonePulseCard } from "../chat/ZonePulseCard";
import { pulseAge, pulseWindowOpen, type PulsePost } from "@/lib/spxPulse";
import { usePulseFeed } from "@/hooks/usePulseFeed";

export function SpxPulseRoom({ source = "cloud", active = true }: { source?: "cloud" | "local"; active?: boolean }) {
  const [paused, setPaused] = useState(false);
  const { feed, connected, error } = usePulseFeed(source, active && !paused);
  const [tf, setTf] = useState<"all" | 5 | 15>("all");
  const [now, setNow] = useState(Date.now());
  const [arrival, setArrival] = useState<string | null>(null);
  const [replay, setReplay] = useState<PulsePost[] | null>(null);
  const [replayCount, setReplayCount] = useState(0);
  const known = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const id = feed.posts.at(-1)?.id || null;
    if (known.current !== id) { setArrival(id); known.current = id; }
  }, [feed.posts]);
  useEffect(() => { if (!arrival) return; const timer = setTimeout(() => setArrival(null), 3000); return () => clearTimeout(timer); }, [arrival]);
  useEffect(() => {
    if (!replay || replayCount >= replay.length) return;
    const timer = setTimeout(() => { setReplayCount(n => n + 1); setArrival(replay[replayCount].id); }, replayCount ? 2400 : 500);
    return () => clearTimeout(timer);
  }, [replay, replayCount]);
  useEffect(() => {
    const el = scroller.current;
    const list = el?.querySelector<HTMLElement>(".pulse-feed");
    if (!el || !list) return;
    const alignLatest = () => {
      const latest = list.lastElementChild as HTMLElement | null;
      if (nearBottom.current && latest) el.scrollTo({ top: Math.max(0, latest.offsetTop - 20), behavior: "instant" });
    };
    alignLatest();
    // Captures load after the feed; keep the headline visible as their height resolves.
    const observer = new ResizeObserver(alignLatest);
    observer.observe(list);
    return () => observer.disconnect();
  }, [feed.posts.length, replayCount, tf]);
  const posts = (replay ? replay.slice(0, replayCount) : feed.posts).filter(p => tf === "all" || p.timeframe === tf);
  const last = posts.at(-1);
  const indicatorFresh = connected && [5,15].every(interval => { const age = now - (feed.indicatorAt[interval as 5 | 15] || 0); return age >= 0 && age <= 90000; });
  const freshTimeframes = connected ? ([5,15] as const).filter(interval => now - (feed.indicatorAt[interval] || 0) >= 0 && now - (feed.indicatorAt[interval] || 0) <= 90000) : [];
  const monitoring = pulseWindowOpen(now) || now < (feed.afterHoursTestUntil || 0);
  const missingTimeframes = ([5,15] as const).filter(interval => !freshTimeframes.includes(interval));
  const noActiveZones = indicatorFresh && ([5,15] as const).every(interval => feed.quotes?.[interval]?.zones.length === 0);
  const latestReview = feed.posts.filter(p => tf === "all" || p.timeframe === tf).at(-1)?.at;
  return <section className="zone-pulse-room" aria-label="SPX500 Zone Pulse">
    <header className="pulse-room-bar"><div className="pulse-room-heading"><Activity size={19} color="#bbffd7"/><div><strong>Vault Pulse</strong><small>SPX500 · 5m & 15m · Capital.com</small></div></div><span className="pulse-state" data-connected={freshTimeframes.length>0}><i/>{paused ? "View paused" : !monitoring ? "Back at 9 AM ET" : freshTimeframes.length ? `${freshTimeframes.map(value=>`${value}m`).join(" + ")} connected` : "Waiting for live updates"}</span></header>
    <div className="pulse-room-controls" aria-label="Pulse controls">{(["all",5,15] as const).map(value => <button key={value} type="button" aria-pressed={tf===value} onClick={()=>setTf(value)}>{value === "all" ? "All updates" : `${value}m`}</button>)}<span className="pulse-control-space"/>
      <button type="button" className="pulse-play" disabled={!feed.posts.length} onClick={()=>{setReplay([...feed.posts]);setReplayCount(0);nearBottom.current=true;}}><Play size={12}/>Replay updates</button><button type="button" aria-label={paused ? "Resume feed" : "Pause feed"} onClick={()=>setPaused(v=>!v)}>{paused ? <Play size={14}/> : <Pause size={14}/>}</button>
      {replay && <button type="button" onClick={()=>{setReplay(null);setReplayCount(0);}}><RotateCcw size={12}/>Return to feed</button>}
    </div>
    <div className="pulse-notice">{replay ? <strong className="pulse-replay-label">Replay · Original timestamps</strong> : <><strong>{source === "local" ? "Private test" : "Member channel"}</strong><span>·</span><span>Monday–Friday · 9 AM–4 PM ET</span></>}</div>
    {error && <div className="pulse-delivery-warning" role="status">{error}</div>}
    {!replay && !paused && monitoring && (connected || feed.quotes) && missingTimeframes.length > 0 && <div className="pulse-delivery-warning" role="alert"><strong>{missingTimeframes.map(interval=>`${interval}m`).join(" + ")} updates interrupted</strong><span>Fresh chart data is missing. Prices and zones below may be out of date.</span></div>}
    {!replay && feed.quotes && <div className="pulse-live-zones">{([5,15] as const).map(interval=>{
      const quote=feed.quotes?.[interval];if(!quote)return null;
      const fresh=!paused && connected && now-quote.at<=90000;
      const active=quote.zones?.find(z=>quote.price>=z.lower && quote.price<=z.upper);
      const priceFormat = (price: number) => price.toLocaleString("en-US",{minimumFractionDigits:1,maximumFractionDigits:2});
      return <div key={interval} data-fresh={fresh}><b>{interval}m</b><span>{!fresh ? "Waiting for an update" : active ? `In ${active.side}` : quote.zones?.length ? `${quote.zones.map(z=>z.side).join(" + ")} on watch` : "No active zone"}{fresh && quote.zones.map(zone=><em key={zone.side}>{zone.side === "supply" ? "Supply" : "Demand"} · {priceFormat(zone.lower)}–{priceFormat(zone.upper)}</em>)}<small>{fresh ? "Price" : "Last price"} {priceFormat(quote.price)} · {pulseAge(quote.at,now)}</small></span></div>;
    })}</div>}
    {!replay && !paused && noActiveZones && <div className="pulse-zone-wait" role="status"><strong>Waiting for the next zone.</strong><span>Your indicator has no active 5m or 15m zone right now. New zones appear here automatically.</span></div>}
    <div className="pulse-scroll" ref={scroller} onScroll={e=>{const el=e.currentTarget;const latest=el.querySelector<HTMLElement>(".pulse-feed > li:last-child");nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<120 || (!!latest && el.scrollTop>=latest.offsetTop-120);}}>
      <ol className="pulse-feed"><li className="pulse-day">{replay ? "REPLAY" : "ZONE UPDATES"}</li>{posts.map((post,index)=><li key={`${replay ? "replay" : "feed"}-${post.id}`}><ZonePulseCard post={post} featured={index===posts.length-1} arriving={post.id===arrival}/></li>)}</ol>
      {!posts.length && <div className="pulse-empty"><PulseOrb active={!!replay}/><h3>{replay ? "Replaying updates…" : paused ? "Your view is paused." : indicatorFresh ? "Watching for the next zone." : "Your market updates, in one place."}</h3><p>{replay ? "Original updates. Original timestamps." : paused ? "Zone monitoring continues. Resume to catch up." : "New zones, entries and breaks appear here automatically."}</p></div>}
    </div>
    <footer className="pulse-footer"><span aria-hidden="true" className="pulse-wave" data-active={!!arrival}>{[0,1,2,3,4,5,6].map(i=><i key={i} style={{"--i":i} as React.CSSProperties}/>)}</span><span role="status">{replay ? `${replayCount} of ${replay.length} captures` : paused ? "Feed view paused" : indicatorFresh ? "Watching 5m + 15m automatically" : `Last chart check ${pulseAge(latestReview,now)}`}</span><span>{paused ? "Zone monitoring continues" : indicatorFresh ? "Posts when the zone changes" : !monitoring ? "Next session starts at 9 AM ET" : "Connecting to your feed"}</span></footer>
    <span className="sr-only" aria-live="polite">{arrival && last ? `$SPX500 ${last.timeframe} minute ${last.side} chart update received.` : ""}</span>
  </section>;
}
