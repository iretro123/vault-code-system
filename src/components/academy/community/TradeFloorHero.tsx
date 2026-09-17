import { TrendingUp } from "lucide-react";
import { useHotTickers } from "@/hooks/useHotTickers";

export function TradeFloorHero() {
  const hotTickers = useHotTickers();

  if (hotTickers.length === 0) return null;

  return (
    <div className="shrink-0 px-5 py-2.5 bg-white/[0.03] border-b border-white/[0.05]">
      <div className="flex flex-wrap items-center gap-2">
        <TrendingUp className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground" title="Mentions in up to 200 recent chat messages from the past 24 hours. Refreshed every 5 minutes, not a price feed or recommendation.">Mentioned in chat</span>
        {hotTickers.slice(0, 4).map((t) => (
          <span key={t} className="text-sm font-mono font-semibold text-blue-300 bg-primary/[0.06] border border-primary/[0.12] rounded px-1.5 py-0.5">
            ${t}
          </span>
        ))}
      </div>
    </div>
  );
}
