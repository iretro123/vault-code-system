import { useEffect, useState } from "react";
import { ArrowLeft, Radio } from "lucide-react";
import type { BitcoinZonePost } from "@/lib/bitcoinZones";
import { zonePostCopy, shortZoneSummary } from "@/lib/zonePostCopy";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { zoneMonitorStatus, type ZoneMonitor } from "@/lib/zoneMonitor";
export const liveZonesPreviewEnabled = import.meta.env.DEV && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
const labels = { created: "Zone visible on the indicator", entered: "Price is in the zone", holding: "Holding on candle close", broken: "Zone broken · Be careful", retired: "Zone no longer shown by the indicator", observed: "Chart observation" };

function ZoneChartImage({ post }: { post: BitcoinZonePost }) {
  // Match the first verified capture's 1048 × 1395 window for every update.
  // Contain the complete original: never crop, stretch, or zoom market evidence.
  return <div className="aspect-[1048/1395] w-full bg-[#303238]">
    <img src={post.chartUrl} alt={`BTC ${post.timeframe}m ${post.side} zone chart preview; open for the complete original`}
      className="block h-full w-full object-contain" loading="lazy"/>
  </div>;
}

export function LiveZonesPreview({ onBack }: { onBack: () => void }) {
  const [posts, setPosts] = useState<BitcoinZonePost[]>([]);
  const [expanded, setExpanded] = useState<BitcoinZonePost | null>(null);
  const [timeframe, setTimeframe] = useState<"all" | 5 | 15>("all");
  const [status, setStatus] = useState("Connecting to local receiver…");
  const [monitor, setMonitor] = useState<ZoneMonitor>({});
  const [now, setNow] = useState(Date.now());
  const [receiverOnline, setReceiverOnline] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!liveZonesPreviewEnabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/bitcoin-zones/", { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!cancelled) {
          setPosts(data.posts);
          setMonitor(data.monitor ?? {});
          setReceiverOnline(true);
          setStatus(data.connected ? "Verified chart updates received" : data.receiverConfigured ? "Waiting for a verified chart update" : "Receiver unavailable");
        }
      } catch { if (!cancelled) { setStatus("Connection interrupted · Retrying"); setReceiverOnline(false); } }
      finally { if (!cancelled) timer = setTimeout(refresh, 2000); }
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, []);
  if (!liveZonesPreviewEnabled) return null;
  const visiblePosts = posts.filter(e => timeframe === "all" || e.timeframe === timeframe);
  const latestVisible = visiblePosts.at(-1);
  const latestHealth = receiverOnline ? zoneMonitorStatus(monitor[latestVisible?.timeframe ?? 15], now) : "paused";
  return <section className="flex h-full min-h-0 flex-col bg-[#17191f] text-slate-100">
    <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#252731] via-[#1d2028] to-[#202733] px-4 py-3">
      <button aria-label="Back to Community" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/5"><ArrowLeft size={20}/></button>
      <div className="min-w-0 flex-1"><h2 className="text-xl font-medium tracking-tight">Zone Room<span aria-hidden="true" className="ml-2 text-sky-200">✦</span></h2></div>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-widest text-slate-200">BTC</span>
    </header>
    <div className="shrink-0 border-b border-white/[0.06] bg-[#1b1e25] px-4 py-2">
      <div className="flex flex-wrap gap-x-5 gap-y-2">{([5,15] as const).map(tf => {
        const check = monitor[tf];
        const health = receiverOnline ? zoneMonitorStatus(check, now) : "paused";
        return <div key={tf} title={check?.lastCheckedAt ? `Last verified check: ${new Date(check.lastCheckedAt).toLocaleString()}` : "No verified chart check"} className="flex items-center gap-2 py-1 text-xs text-slate-300">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${health === "fresh" ? "bg-emerald-400 motion-safe:animate-pulse" : health === "paused" || health === "stale" ? "bg-amber-400" : "bg-slate-500"}`}/>
          <span>{tf}m · {health === "fresh" ? "Monitoring" : health === "stale" ? "Check overdue" : health === "paused" ? "Paused" : "Not verified"}</span>
        </div>;
      })}</div>
      {!receiverOnline && <p role="status" className="mt-1 text-xs text-amber-200">{status}</p>}
    </div>
    <div aria-label="Filter chart timeframe" className="flex shrink-0 gap-2 border-b border-white/5 px-4 py-3">{(["all",5,15] as const).map(value => <button key={value} aria-pressed={timeframe===value} onClick={()=>setTimeframe(value)} className={`min-h-11 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${timeframe===value ? "bg-slate-200 text-slate-950 shadow-sm" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>{value==="all" ? "All updates" : `${value}-minute`}</button>)}</div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-6">
      <div className="mx-auto max-w-3xl">
        {posts.filter(e=>timeframe==="all"||e.timeframe===timeframe).length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-12 text-center"><Radio className="mx-auto mb-3 text-slate-400" size={26}/><h3 className="text-lg font-medium">{timeframe==="all" ? "Waiting for a verified BTC update" : `No verified ${timeframe}-minute update yet`}</h3><p className="mt-2 text-sm text-slate-400">Old chart screenshots are not retained here. The next post will include its exact date and capture time.</p></div>}
        <ol className="space-y-8">{posts.filter(e=>timeframe==="all"||e.timeframe===timeframe).map(e => <li key={e.id} className="flex gap-3 sm:gap-4">
          <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-xl shadow-lg shadow-violet-950/20">✦</div>
          <article className="min-w-0 flex-1 border-b border-white/10 pb-7">
            <div className="mb-3"><time dateTime={new Date(e.at).toISOString()} className="block text-lg font-bold tracking-tight text-slate-100 sm:text-xl">{new Date(e.at).toLocaleDateString([], {weekday:"long",month:"short",day:"numeric"})}</time><div className="mt-1 flex flex-wrap items-center gap-2"><span className="font-semibold text-violet-200">Vault Scout</span><span className="rounded-md bg-violet-400/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-100">CHART UPDATE</span><span className="text-xs text-slate-400">Captured {new Date(e.at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit",second:"2-digit"})}</span></div></div>
            <div className="mb-3 mt-3 flex flex-wrap items-center gap-2"><strong className="mr-1 text-2xl font-bold tracking-tight sm:text-3xl"><span className="text-amber-300">₿</span> BTC<span className="text-base font-normal text-slate-400"> / USD</span></strong><span className="rounded-lg bg-violet-400/20 px-2.5 py-1 text-sm font-semibold text-violet-100">{e.timeframe}m</span><span className={`rounded-lg px-2.5 py-1 text-sm font-semibold capitalize ${e.side === "demand" ? "bg-emerald-300/20 text-emerald-200" : "bg-rose-300/20 text-rose-200"}`}>{e.side === "demand" ? "↗" : "↘"} {e.side}</span></div>
            <h3 className={`mb-2 text-xl font-semibold tracking-tight ${e.kind === "broken" ? "text-rose-200" : "text-sky-100"}`}>{e.id!==e.zoneId ? "↳ Following this zone" : e.kind === "entered" ? "📍 Price entered the zone" : e.kind === "observed" || e.kind === "created" ? "👀 Zone on the radar" : zonePostCopy(e).title}</h3>
            {e.source !== "visual-review" && <p className="text-sm text-slate-300">{e.lower.toLocaleString()}–{e.upper.toLocaleString()} USD</p>}
            <p className={e.kind === "broken" ? "text-rose-300" : "text-slate-200"}>{e.source === "visual-review" ? shortZoneSummary(e) : labels[e.kind]}</p>
            {!e.confirmed && e.source !== "visual-review" && <p className="mt-1 text-xs text-slate-400">Candle was still forming at capture · Not a confirmed close</p>}
            {e.trend !== "unknown" && <p className="mt-1 text-xs text-slate-400">{e.trend === "aligned" ? "Trend aligned · Can still fail" : "Against trend · Extra caution"}</p>}
            {e.chartUrl ? <><button onClick={() => setExpanded(e)} aria-label={`Expand BTC ${e.timeframe}m chart`} className="mt-3 block w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-black/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><ZoneChartImage post={e}/><span className="block border-t border-white/5 px-3 py-2 text-xs text-slate-300">Chart preview · Open full original ↗</span></button>{e.capturedAt && <p className="mt-2 text-xs text-slate-400">Snapshot · {new Date(e.capturedAt).toLocaleString()} · Not a live chart</p>}</> : <p className="mt-2 text-xs text-slate-400">{e.captureStatus === "pending" ? "Chart capture pending" : "Chart capture unavailable"}</p>}
            <details className="mt-4 max-w-xl rounded-xl border border-amber-200/15 bg-amber-300/[0.06] p-3"><summary className="min-h-8 cursor-pointer text-sm font-semibold text-amber-100">💡 How to approach this · 3 simple rules</summary><p className="mt-2 text-sm leading-6 text-slate-300">{zonePostCopy(e).explanation}</p><ol className="mt-3 space-y-3 text-sm leading-6 text-slate-200 sm:text-base">{zonePostCopy(e).points.map((point,index) => <li key={point} className="flex gap-3"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${["bg-sky-300/20 text-sky-100","bg-violet-300/20 text-violet-100","bg-amber-300/20 text-amber-100"][index]}`}>{index+1}</span><span>{point.replace(/^\d\. /, "")}</span></li>)}</ol></details>
            {e.id === latestVisible?.id && <div className="mt-5 flex items-center gap-3 rounded-xl border border-sky-200/10 bg-gradient-to-r from-sky-200/[0.06] to-transparent px-3 py-3">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${latestHealth === "fresh" ? "bg-sky-200 shadow-[0_0_10px_rgba(186,230,253,0.45)] motion-safe:animate-pulse" : "bg-slate-500"}`}/>
              <span role="status" className="text-sm font-medium tracking-wide text-slate-300">{latestHealth === "fresh" ? "Still monitoring" : latestHealth === "stale" ? "Check overdue" : latestHealth === "paused" ? "Monitoring paused" : "Awaiting first check"}</span>
              {latestHealth === "fresh" && <span aria-hidden="true" className="flex items-center gap-1">{[0,1,2].map(dot => <span key={dot} className="h-1 w-1 rounded-full bg-sky-200/80 motion-safe:animate-pulse" style={{animationDelay:`${dot * 220}ms`}}/>)}</span>}
            </div>}
          </article>
        </li>)}</ol>
      </div>
    </div>
    <Dialog open={!!expanded} onOpenChange={open => { if (!open) setExpanded(null); }}><DialogContent className="max-w-5xl border-white/10 bg-[#25262b] text-slate-100"><DialogTitle>BTC/USD · {expanded?.timeframe}m {expanded?.side} · Chart snapshot</DialogTitle>{expanded?.chartUrl && <img src={expanded.chartUrl} alt="Full original chart snapshot" className="max-h-[75dvh] w-full object-contain"/>}</DialogContent></Dialog>
  </section>;
}
