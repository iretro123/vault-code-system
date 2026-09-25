import { useEffect, useRef, useState } from "react";
import { Activity, ArrowUpRight, Expand, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import "./pulse-chart-post.css";

export interface PulseEntryMarkup {
  /** Markup belongs to one exact capture. Never reuse it on a newer chart. */
  sourceUrl: string;
  width: number;
  height: number;
  path: string;
  point: { x: number; y: number };
}

export interface PulseChartPostProps {
  symbol: string;
  timeframe: 5 | 15;
  side: "demand" | "supply" | "neutral";
  headline: string;
  capturedAt: number;
  chartCapturedAt?: number;
  captureStatus?: "pending" | "unavailable";
  chartUrl?: string;
  lower?: number;
  upper?: number;
  note?: string;
  arriving?: boolean;
  showIdentity?: boolean;
  defaultShowChart?: boolean;
  entryMarkup?: PulseEntryMarkup;
  reactions?: { emoji: string; count: number; active: boolean }[];
  onReact?: (emoji: string) => void;
}

export function PulseChartPost({
  symbol, timeframe, side, headline, capturedAt, chartCapturedAt = capturedAt, captureStatus = "pending", chartUrl, lower, upper, note,
  arriving = false, showIdentity = true, defaultShowChart = true,
  entryMarkup, reactions, onReact,
}: PulseChartPostProps) {
  const [expanded, setExpanded] = useState(false);
  const [actualSize, setActualSize] = useState(false);
  const originalViewer = useRef<HTMLDivElement>(null);
  const [showChart, setShowChart] = useState(defaultShowChart);
  const [showExample, setShowExample] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setShowExample(false);
    setExpanded(false);
    setActualSize(false);
    setFailed(false);
    setLoaded(false);
    setDimensions({ width: 0, height: 0 });
  }, [chartUrl]);
  useEffect(() => { setShowChart(defaultShowChart); }, [defaultShowChart]);
  useEffect(() => {
    const viewer = originalViewer.current;
    if (actualSize && viewer) viewer.scrollLeft = Math.max(0, (viewer.scrollWidth - viewer.clientWidth) / 2);
  }, [actualSize, expanded]);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(capturedAt);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }).format(capturedAt);
  const chartTime = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(chartCapturedAt);
  const price = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const levels = side !== "neutral" && Number.isFinite(lower) && Number.isFinite(upper) && lower! < upper!;
  const canAnnotate = side !== "neutral" && loaded && !failed && entryMarkup?.sourceUrl === chartUrl
    && entryMarkup.width === dimensions.width && entryMarkup.height === dimensions.height;
  const chartAlt = `Original TradingView ${symbol} ${timeframe}-minute Pulse chart, captured ${chartTime} ET`;

  return <article className={`pulse-chart-post${arriving ? " pcp-arriving" : ""}`} data-side={side} aria-label={`${symbol} ${timeframe}-minute ${side} update`}>
    {showIdentity && <header className="pcp-author"><span><Activity size={20} aria-hidden="true"/> Pulse</span><time dateTime={new Date(capturedAt).toISOString()}>{date} · {time} ET</time></header>}
    <div className="pcp-surface">
      <div className="pcp-copy">
        <div className="pcp-meta"><span>${symbol}</span><span>{timeframe}m</span><span className="pcp-side">{side === "neutral" ? "Chart check" : side}</span></div>
        <h3>{headline}</h3>
        {levels && <p className="pcp-range" aria-label={`Zone from ${price(lower!)} to ${price(upper!)}`}><span>${price(lower!)}</span><span aria-hidden="true">—</span><span>${price(upper!)}</span></p>}
        {note && <p className="pcp-note">{note}</p>}
      </div>
      {chartUrl ? <>
        {showChart && <figure className="pcp-chart" aria-label="Original chart screenshot">
          {!failed && <div className="pcp-photo">
            <img key={attempt} src={chartUrl} alt={chartAlt} onLoad={event => {
              setLoaded(true);
              setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
            }} onError={() => { setFailed(true); setLoaded(false); setShowExample(false); }}/>
            {showExample && canAnnotate && entryMarkup && <>
              <svg className="pcp-entry-markup" viewBox={`0 0 ${entryMarkup.width} ${entryMarkup.height}`} role="img" aria-label="Hypothetical entry path. This is an example, not a confirmed signal.">
                <path d={entryMarkup.path} className="pcp-example-path"/>
                <circle cx={entryMarkup.point.x} cy={entryMarkup.point.y} r="11" className="pcp-example-ring"/>
                <circle cx={entryMarkup.point.x} cy={entryMarkup.point.y} r="4" className="pcp-example-point"/>
              </svg>
              <span className="pcp-example-label">Entry example</span>
            </>}
            {loaded && <button type="button" className="pcp-expand" onClick={() => { setActualSize(false); setExpanded(true); }} aria-label={`Expand original ${symbol} ${timeframe}-minute screenshot`}><Expand size={18} aria-hidden="true"/></button>}
          </div>}
          {failed && <div className="pcp-missing" role="status"><p>Chart couldn’t load.</p><button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}><RotateCcw size={16} aria-hidden="true"/> Try again</button></div>}
        </figure>}
      </> : <p className="pcp-pending" role="status">{captureStatus === "unavailable" ? "Original chart unavailable for this update." : "Waiting for the original chart."}</p>}
      {(onReact || canAnnotate || (chartUrl && !showChart)) && <footer className="pcp-actions">
        {onReact && reactions && <div className="pcp-reactions" aria-label="Reactions">{reactions.map(reaction => <button type="button" key={reaction.emoji} aria-label={`React ${reaction.emoji}`} aria-pressed={reaction.active} onClick={() => onReact(reaction.emoji)}>{reaction.emoji}{reaction.count > 0 && <span>{reaction.count}</span>}</button>)}</div>}
        {chartUrl && !showChart && <button type="button" className="pcp-entry-button" onClick={() => setShowChart(true)}>View chart <ArrowUpRight size={17} aria-hidden="true"/></button>}
        {canAnnotate && <button type="button" className="pcp-entry-button" aria-pressed={showExample} onClick={() => setShowExample(value => !value)}>{showExample ? "Hide example" : "See entry example"}<ArrowUpRight size={17} aria-hidden="true"/></button>}
      </footer>}
    </div>
    <Dialog open={expanded} onOpenChange={setExpanded}>
      <DialogContent className="pcp-dialog max-w-6xl border-white/10 bg-[#19222f] text-slate-100">
        <DialogTitle>{symbol} · {timeframe}m · Original chart</DialogTitle>
        <DialogDescription className="text-slate-400">Captured {chartTime} ET.</DialogDescription>
        <button type="button" className="pcp-size-switch" aria-pressed={actualSize} onClick={() => setActualSize(value => !value)}>{actualSize ? <ZoomOut size={16}/> : <ZoomIn size={16}/>} {actualSize ? "Fit to screen" : "Actual size"}</button>
        <div ref={originalViewer} className={`pcp-original-view${actualSize ? " pcp-actual" : ""}`}><img src={chartUrl} alt={`Full unmodified screenshot: ${chartAlt}`}/></div>
      </DialogContent>
    </Dialog>
  </article>;
}
