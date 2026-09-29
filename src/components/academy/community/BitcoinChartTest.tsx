import { useEffect, useRef, useState } from "react";

export function BitcoinChartTest() {
  const host = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState<"5" | "15">("5");
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    setFailed(false);
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true, symbol: "COINBASE:BTCUSD", interval, timezone: "America/New_York",
      theme: "dark", style: "1", locale: "en", allow_symbol_change: false,
      hide_side_toolbar: true, hide_top_toolbar: false, calendar: false,
      save_image: false, withdateranges: false, studies: [],
    });
    script.onerror = () => setFailed(true);
    container.replaceChildren(widget, script);
    return () => { script.onerror = null; container.replaceChildren(); };
  }, [interval, attempt]);
  return <div className="space-y-3 rounded-xl border border-white/10 bg-[#181c23] p-3">
    <div className="flex flex-wrap items-center gap-2"><h3 className="mr-auto font-medium">Bitcoin · Weekend chart test</h3>{(["5", "15"] as const).map(value => <button key={value} aria-pressed={interval === value} onClick={() => setInterval(value)} className={`min-h-11 rounded-lg px-3 text-sm ${interval === value ? "bg-sky-300/15 text-sky-200" : "text-slate-300"}`}>{value}m</button>)}</div>
    <p className="text-sm leading-6 text-slate-300">TradingView chart data · Coinbase BTC/USD · 24/7 crypto test only. Your custom Pine zones and the alert receiver are <strong>not connected</strong> to this widget.</p>
    <div ref={host} className="tradingview-widget-container h-[430px] w-full min-w-0 md:h-[520px]"/>
    <div className="tradingview-widget-copyright text-xs text-slate-400"><a href="https://www.tradingview.com/symbols/BTCUSD/?exchange=COINBASE" target="_blank" rel="noopener noreferrer">BTCUSD chart</a> by TradingView</div>
    <div className="flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-xs text-slate-400">{failed ? "TradingView could not load. Try reloading the chart." : "If the chart stays blank, reload it. Chart loading does not verify alert delivery."}</p><button onClick={() => setAttempt(v => v + 1)} className="min-h-11 px-3 text-sm text-sky-200">Reload chart</button></div>
  </div>;
}
