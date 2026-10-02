import { PulseDirection } from "../chat/PulseDirection";
import { useEffect, useRef, useState } from "react";
import { Activity, History, ChevronDown, ArrowUpRight, ArrowUp, ChevronUp } from "lucide-react";
import { PulseLiquidityChart } from "../chat/PulseLiquidityChart";
import { ZonePulseCard } from "../chat/ZonePulseCard";
import { pulseAge, pulseWindowOpen } from "@/lib/spxPulse";
import { usePulseLiquidity } from "@/hooks/usePulseLiquidity";
import { PulseChartPost } from "../chat/PulseChartPost";
import { usePulseFeed } from "@/hooks/usePulseFeed";
import { usePulseReactions } from "@/hooks/usePulseReactions";
import "./pulse-room.css";

type MemberSymbol = 'AMEX:SPY' | 'NASDAQ:QQQ';
export function SpxPulseRoom({ source = "cloud", active = true }: { source?: "cloud" | "local"; active?: boolean }) {
  const [selected,setSelected]=useState<MemberSymbol>(()=>new URLSearchParams(location.search).get('symbol')==='QQQ'?'NASDAQ:QQQ':'AMEX:SPY');
  return <PulseMarketRoom key={selected} source={source} active={active} selected={selected} onSymbol={setSelected}/>;
}
function PulseMarketRoom({source,active,selected,onSymbol}:{source:'cloud'|'local';active:boolean;selected:MemberSymbol;onSymbol:(symbol:MemberSymbol)=>void}) {
  const { feed: receivedFeed, connected, error } = usePulseFeed(source, active, selected);
  const feed = receivedFeed.symbol && receivedFeed.symbol !== selected ? {...receivedFeed,posts:[],quotes:{},indicatorAt:{},receivedAt:null} : receivedFeed;
  const liquidity = usePulseLiquidity(active && source === "cloud",selected);
  const [showLiquidity,setShowLiquidity] = useState(()=>{try{return localStorage.getItem("vault:pulse:liquidity")==="on";}catch{return false;}});
  const toggleLiquidity=()=>{setHistory(false);setShowLiquidity(value=>{try{localStorage.setItem("vault:pulse:liquidity",!value?"on":"off");}catch{/* Preference remains usable for this visit. */}return !value;});};
  const [tf, setTf] = useState<5 | 15>(5);
  const [now, setNow] = useState(Date.now());
  const [history, setHistory] = useState(false);
  const [arrival, setArrival] = useState<string | null>(null);
  const [unseen, setUnseen] = useState(false);
  const known = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const symbol = selected;
  const symbolLabel = symbol.split(":").at(-1)!;
  const allPosts = feed.posts.filter(post => post.timeframe === tf).slice().reverse();
  const quote = feed.quotes?.[tf];
  // Follow the actual feed session, not midnight or the viewer's timezone.
  // Overnight/weekend history stays intact until the next session sends data.
  const sessionDate = (at: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const sessionKey = sessionDate(Math.max(quote?.at ?? 0, allPosts[0]?.at ?? 0));
  const posts = allPosts.filter(post => sessionDate(post.at) === sessionKey);
  const latest = posts[0];
  const awaitingActivation = selected === 'NASDAQ:QQQ' && feed.enabled === false;
  const monitoring = pulseWindowOpen(now) || now < (feed.afterHoursTestUntil || 0);
  const fresh = connected && !!quote && now >= quote.at && now - quote.at <= 90000;
  const noZone = fresh && monitoring && quote.zones.length === 0;
  const checkedTime = quote ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(quote.at) : "";
  const liquiditySnapshot = liquidity[tf];
  const liquidityFresh = !!liquiditySnapshot?.available && !!liquiditySnapshot.capturedAt && now >= liquiditySnapshot.capturedAt && now-liquiditySnapshot.capturedAt<=180000;
  const liquidityView = showLiquidity && source === "cloud";
  const otherTf = tf === 5 ? 15 : 5;
  const otherQuote = feed.quotes?.[otherTf];
  const otherHasZone = monitoring && connected && !!otherQuote && now >= otherQuote.at
    && now - otherQuote.at <= 90000 && otherQuote.zones.length > 0;
  // A new session resets visible history, not zones the fresh indicator still
  // reports. Render their current bounds and exact-zone saved chart even when
  // the zone has not produced another event in today's session yet.
  const closingSnapshot = !!quote && (!monitoring || (!fresh && !!quote.chartUrl)
    || (fresh && quote.zones.length > 0 && posts.length === 0));
  const closingChart = quote && allPosts.filter(post => post.symbol === symbol && !!post.chartUrl
    && !!post.capturedAt && post.capturedAt <= quote.at
    && quote.zones.some(zone => zone.zoneId === post.zoneId && zone.side === post.side
      && zone.lower === post.lower && zone.upper === post.upper))
    .sort((a,b)=>(b.capturedAt ?? 0)-(a.capturedAt ?? 0))[0];
  const snapshotChartUrl = quote?.chartUrl ?? closingChart?.chartUrl;
  const snapshotChartAt = quote?.chartCapturedAt ?? closingChart?.capturedAt;
  const snapshotSides = new Set(quote?.zones.map(zone => zone.side));
  const snapshotSide = snapshotSides.size === 1 ? quote!.zones[0].side : "neutral";
  const snapshotTime = quote ? new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(quote.at) : "";
  const shown = history ? posts : noZone || closingSnapshot || liquidityView ? [] : posts.slice(0, 1);
  const earlierCount = noZone || closingSnapshot || liquidityView ? posts.length : Math.max(0, posts.length - 1);
  const awaitingChart = !!latest && !history && !noZone && !closingSnapshot && !liquidityView
    && latest.captureStatus === "pending" && !latest.chartUrl
    && !allPosts.some(candidate => candidate.zoneId === latest.zoneId && candidate.symbol === latest.symbol
      && candidate.timeframe === latest.timeframe && candidate.side === latest.side
      && candidate.lower === latest.lower && candidate.upper === latest.upper
      && !!candidate.chartUrl && (candidate.capturedAt ?? candidate.at) <= latest.at);
  const reactions = usePulseReactions(shown.map(post => post.id), active && source === "cloud");
  const inZone = quote?.zones.find(zone => quote.price >= zone.lower && quote.price <= zone.upper);
  const currentState = !fresh ? "" : inZone ? `In ${tf}m ${inZone.side}` : quote?.zones.length ? `${tf}m ${quote.zones.map(zone => zone.side).join(" + ")} on watch` : `No active ${tf}m zone`;

  useEffect(() => { setHistory(false); setUnseen(false); }, [sessionKey]);
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
  const closeHistory = () => {
    setHistory(false); setUnseen(false);
    scroller.current?.scrollTo({ top: 0, behavior: "instant" });
  };
  const liveChart = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&interval=${tf}`;

  return <section className="zone-pulse-room pulse-room-clean" aria-label={`${symbolLabel} Zone Pulse`}>
    <header className="pr-toolbar">
      <span className="pr-symbol"><Activity size={25} aria-hidden="true"/><select className="pr-symbol-select" aria-label="Pulse symbol" value={selected} onChange={event=>onSymbol(event.target.value as MemberSymbol)}><option value="AMEX:SPY">$SPY</option><option value="NASDAQ:QQQ">$QQQ</option></select></span>
      <div className="pr-timeframes" aria-label="Chart timeframe">{([5, 15] as const).map(value => <button key={value} type="button" aria-pressed={tf === value} onClick={() => changeTimeframe(value)}>{value} min</button>)}</div>
    {source === "cloud" && <button type="button" role="switch" aria-checked={showLiquidity} className="pr-liquidity-toggle" onClick={toggleLiquidity}>Liquidity<span aria-hidden="true"/></button>}
    </header>
    <div className="pr-scroll" ref={scroller} onScroll={event => { if (event.currentTarget.scrollTop < 80) setUnseen(false); }}>
      <div className="pr-content">
        <div className="pr-now" role="status" data-fresh={fresh && monitoring}>
          <span><span className="pr-market-state" data-closed={!monitoring}><i aria-hidden="true"/>{awaitingActivation ? "Setting up QQQ" : monitoring ? fresh ? "Live updates" : "Reconnecting" : "Market closed"}</span>{quote && <b>${quote.price.toFixed(2)}</b>}</span>
          <span>{monitoring && fresh ? noZone ? "" : currentState : quote ? `Last update ${pulseAge(quote.at, now)}` : ""}</span>
        </div>
        {!quote && !latest && !error && selected==='NASDAQ:QQQ' && <div className="pr-empty pr-no-zone"><Activity size={34}/><h2>Waiting for QQQ</h2><p>Verified 5m &amp; 15m updates will appear here.</p></div>}
        {error && <p className="pr-warning" role="alert">{error}</p>}
        {monitoring && connected && !!quote && !fresh && !error && <p className="pr-warning" role="alert">Waiting for fresh {tf}m data. The price and zones below may be out of date.</p>}
        {closingSnapshot && !liquidityView && <section className="pr-snapshot" data-side={snapshotSide} aria-label={`${tf}-minute last indicator snapshot`}>
          <p className="pr-snapshot-time">Zones · {snapshotTime} ET</p>
          <h2 className="sr-only">{tf}-minute zones</h2>
          {quote.zones.length ? <ul>{quote.zones.map(zone => <li key={`${zone.side}:${zone.lower}:${zone.upper}`} data-side={zone.side}>
            <div className="pr-snapshot-heading">
              <span className="pr-snapshot-side">{tf} min {zone.side}</span>
              <PulseDirection side={zone.side}/>
            </div><strong>${zone.lower.toFixed(2)} – ${zone.upper.toFixed(2)}</strong>
          </li>)}</ul> : <p className="pr-snapshot-none">No active {tf}-minute zone at this update.</p>}
          {snapshotChartUrl && snapshotChartAt && <PulseLiquidityChart
            key={`${tf}:${quote.at}`} symbol={symbolLabel} timeframe={tf} side={snapshotSide}
            headline="TradingView chart" capturedAt={quote.at} chartCapturedAt={snapshotChartAt}
            captureContext={quote.chartUrl ? quote.chartContext ?? "refresh" : "earlier"} chartUrl={snapshotChartUrl} liquidityChart={quote.chartUrl ? quote.liquidityChart : undefined} showIdentity={false}
            defaultShowChart />}


        </section>}
        {noZone && !liquidityView && <div className="pr-empty pr-no-zone pr-feed-live" role="status"><Activity size={34} strokeWidth={1.3} aria-hidden="true"/><h2>No active zone</h2><p className="pr-zone-checked"><span>Live</span> · Checked <time dateTime={new Date(quote!.at).toISOString()}>{checkedTime} ET</time></p>{(tf === 5 || otherHasZone) && <button type="button" className="pr-other-timeframe" onClick={() => changeTimeframe(otherTf)}>Check {otherTf}-minute timeframe <ArrowUpRight size={18} aria-hidden="true" /></button>}</div>}
        {liquidityView && !history && <>
          {liquiditySnapshot?.capturedAt && liquiditySnapshot.chartUrl ? <PulseChartPost symbol={symbolLabel} timeframe={tf} side="neutral" headline={`${tf}-minute liquidity`} capturedAt={liquiditySnapshot.capturedAt!} chartCapturedAt={liquiditySnapshot.capturedAt!} chartUrl={liquiditySnapshot.chartUrl} showIdentity={false} note={!liquidityFresh ? "Last saved liquidity · Not live" : noZone ? "No active zone" : currentState || undefined}/> : <div className="pr-empty pr-no-zone"><Activity size={34}/><h2>{monitoring ? "Liquidity updating" : "Market closed"}</h2><p className="pr-zone-checked">{monitoring ? "Waiting for a fresh TradingView chart" : "Liquidity resumes next session"}</p></div>}
          {tf===5 && noZone && <button type="button" className="pr-other-timeframe" onClick={()=>changeTimeframe(15)}>Check 15-minute timeframe <ArrowUpRight size={18}/></button>}
        </>}
        {(noZone || closingSnapshot || liquidityView) && history && <p className="pr-history-label">Earlier updates</p>}
        <ol className="pr-posts">{shown.map((post, index) => <li key={post.id}>{history && index === 0 && <span className="pr-history-latest">Most recent update</span>}<ZonePulseCard post={post} earlierChart={allPosts.find(candidate => candidate.zoneId === post.zoneId && !!candidate.chartUrl && (candidate.capturedAt ?? candidate.at) <= post.at)} featured={index === 0} arriving={post.id === arrival} reactions={reactions.forPost(post.id)} onReact={source === "cloud" ? emoji => reactions.react(post.id, emoji) : undefined} reactionsDisabled={reactions.pending}/></li>)}</ol>
        {!(selected==='NASDAQ:QQQ' && !quote && !latest) && !posts.length && !noZone && !closingSnapshot && !liquidityView && <div className="pr-empty"><Activity size={34} strokeWidth={1.3} aria-hidden="true"/><h2>{!monitoring ? "Next session, new zones." : fresh ? "Watching for an update." : "Checking for zones…"}</h2></div>}
        <div className="pr-actions">
        {earlierCount > 0 && !history && <button type="button" className={`pr-history${awaitingChart ? " pr-history-pending" : ""}`} aria-label={`Earlier updates (${earlierCount})`} aria-expanded={false} onClick={() => setHistory(true)}><History size={20} aria-hidden="true"/><span className="pr-history-title"><span className="pr-desktop-label">Earlier </span>Updates</span><span className="pr-history-count" aria-hidden="true">{earlierCount}</span><ChevronDown size={18} aria-hidden="true"/></button>}
        <div className="pr-source">
          <a className="pr-tradingview" href={liveChart} target="_blank" rel="noopener noreferrer" aria-label={`Open ${symbolLabel} on TradingView`}>
            <img src="/brand/tradingview-mark.svg" alt="" width="36" height="36" />
            <span><strong><span className="pr-desktop-label">Open in </span>TradingView</strong></span>
            <ArrowUpRight size={22} aria-hidden="true"/>
          </a>
          {monitoring && source === "cloud" && (feed.captureConnected === false || feed.captureHealth?.[tf]?.state === "attention") && <p role="status">Chart capture needs attention</p>}
        </div>
        </div>

      </div>
    </div>
    {history && <div className="pr-history-dock">
      <button type="button" onClick={closeHistory} aria-expanded="true">
        <ChevronUp size={19} aria-hidden="true" /> Hide earlier updates

      </button>
    </div>}
    {unseen && <button type="button" className="pr-new" onClick={openLatest}><ArrowUp size={16}/> New update</button>}
    <span className="sr-only" aria-live="polite">{arrival && latest ? `$${symbolLabel} ${tf} minute ${latest.side} update received.` : ""}</span>
  </section>;
}
