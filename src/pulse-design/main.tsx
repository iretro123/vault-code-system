import { createRoot } from "react-dom/client";
import { useState } from "react";
import { Activity } from "lucide-react";
import { PulseChartPost } from "@/components/academy/chat/PulseChartPost";
import fiveMinuteCapture from "./assets/spy-pulse-5m-2026-09-25.png";
import fifteenMinuteCapture from "./assets/spy-pulse-15m-2026-09-25.png";
import "@/index.css";
import "./preview.css";

const captures = {
  5: {
    url: fiveMinuteCapture, at: Date.parse("2026-09-25T14:21:58Z"),
    headline: "No active 5m zone.",
  },
  15: {
    url: fifteenMinuteCapture, at: Date.parse("2026-09-25T14:21:21Z"),
    headline: "No active 15m zone.",
  },
};

export function PulseDesignPreview() {
  const [timeframe, setTimeframe] = useState<5 | 15>(5);
  const [reactions, setReactions] = useState<Record<number, string[]>>({ 5: [], 15: [] });
  const capture = captures[timeframe];
  return <main className="pulse-design-page">
    <div className="pd-brand"><strong>VAULT <span>OS</span></strong><span>Design preview</span></div>
    <section className="pd-community" aria-label="Vault Community Pulse preview">
      <header className="pd-header"><h1>Community</h1><nav aria-label="Community preview"><span>Chat</span><span>Signals</span><strong>Pulse</strong><span>Wins</span></nav></header>
      <div className="pd-toolbar"><span><Activity size={21} aria-hidden="true"/> SPY</span><div aria-label="Chart timeframe">{([5, 15] as const).map(value => <button key={value} type="button" aria-pressed={timeframe === value} onClick={() => setTimeframe(value)}>{value} min</button>)}</div></div>
      <div className="pd-feed"><PulseChartPost key={timeframe}
        symbol="SPY" timeframe={timeframe} side="neutral" headline={capture.headline}
        capturedAt={capture.at} chartUrl={capture.url}
        reactions={["🔥", "👀"].map(emoji => ({ emoji, active: reactions[timeframe].includes(emoji), count: reactions[timeframe].includes(emoji) ? 1 : 0 }))}
        onReact={emoji => setReactions(previous => ({ ...previous, [timeframe]: previous[timeframe].includes(emoji) ? previous[timeframe].filter(value => value !== emoji) : [...previous[timeframe], emoji] }))}
      /></div>
      <div className="pd-source"><a href="https://www.tradingview.com/chart/Uvf4q57J/?symbol=SPY" target="_blank" rel="noreferrer">Open live chart ↗</a><p className="pd-preview-note">Snapshot · Does not refresh automatically</p></div>
    </section>
  </main>;
}

// This isolated entry has no feed, authentication, member queries or outbound writes.
if (import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(location.hostname)) {
  createRoot(document.getElementById("root")!).render(<PulseDesignPreview/>);
}
