import { useState } from "react";
import { Users, BookOpen, TrendingUp } from "lucide-react";
import { GuidelinesModal } from "@/components/academy/community/GuidelinesModal";
import { useHotTickers } from "@/hooks/useHotTickers";

export function TradeFloorHero() {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const hotTickers = useHotTickers();

  return (
    <>
      <div className="shrink-0 px-5 py-2.5 bg-[hsl(220,16%,98%)] border-b border-[hsl(220,12%,84%)] shadow-[0_1px_3px_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.02)]">
        {/* Compact header bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-[15px] font-bold text-[hsl(220,15%,16%)] tracking-[-0.01em] shrink-0">
              VAULT Community
            </h2>
            <span className="text-[12px] text-[hsl(220,10%,46%)] font-medium hidden sm:block">
              Trade Floor · fast, clean, and focused
            </span>
          </div>

          {/* Right — HUD chips */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Guidelines */}
            <button
              onClick={() => setGuidelinesOpen(true)}
              className="flex items-center gap-1.5 text-[11px] text-[hsl(220,10%,45%)] hover:text-[hsl(220,10%,25%)] border border-[hsl(220,10%,82%)] rounded-lg px-2.5 py-1.5 transition-colors hover:bg-[hsl(220,10%,92%)]"
            >
              <BookOpen className="h-3 w-3" />
              Guidelines
            </button>

            {/* Reply / React badges */}
            <span className="flex items-center gap-1.5 text-[11px] text-[hsl(220,10%,50%)] border border-[hsl(220,10%,82%)] rounded-lg px-2.5 py-1.5">
              ↩ Reply
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[hsl(220,10%,50%)] border border-[hsl(220,10%,82%)] rounded-lg px-2.5 py-1.5">
              😀 React
            </span>

            {/* Active Now */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[hsl(220,10%,82%)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-[hsl(220,10%,40%)]">12 Active</span>
            </div>
          </div>
        </div>

        {/* Hot Tickers only */}
        {hotTickers.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[hsl(220,12%,88%)]">
            <TrendingUp className="h-3 w-3 text-[hsl(220,10%,50%)]" />
            {hotTickers.slice(0, 4).map((t) => (
              <span key={t} className="text-[11px] font-mono font-semibold text-primary bg-primary/[0.06] border border-primary/[0.12] rounded px-1.5 py-0.5">
                ${t}
              </span>
            ))}
          </div>
        )}
      </div>

      <GuidelinesModal open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
    </>
  );
}
