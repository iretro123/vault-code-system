import { TrendingUp } from "lucide-react";
import { useHotTickers } from "@/hooks/useHotTickers";

export function TradeFloorHero() {
  const hotTickers = useHotTickers();

  if (hotTickers.length === 0) return null;

  return (
    <div className="shrink-0 px-5 py-2.5 bg-[hsl(220,16%,98%)] border-b border-[hsl(220,12%,84%)] shadow-[0_1px_3px_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3 text-[hsl(220,10%,50%)]" />
        {hotTickers.slice(0, 4).map((t) => (
          <span key={t} className="text-[11px] font-mono font-semibold text-primary bg-primary/[0.06] border border-primary/[0.12] rounded px-1.5 py-0.5">
            ${t}
          </span>
        ))}
      </div>
    </div>
  );
}
