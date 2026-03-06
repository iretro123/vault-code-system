import { TrendingUp } from "lucide-react";
import { useHotTickers } from "@/hooks/useHotTickers";

export function TradeFloorHero() {
  const hotTickers = useHotTickers();

  if (hotTickers.length === 0) return null;

  return (
    <div className="shrink-0 px-5 py-2.5 bg-white/[0.03] border-b border-white/[0.05]">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3 text-muted-foreground" />
        {hotTickers.slice(0, 4).map((t) => (
          <span key={t} className="text-[11px] font-mono font-semibold text-primary bg-primary/[0.06] border border-primary/[0.12] rounded px-1.5 py-0.5">
            ${t}
          </span>
        ))}
      </div>
    </div>
  );
}
