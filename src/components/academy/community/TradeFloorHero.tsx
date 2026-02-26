import { useState } from "react";
import { Users, BookOpen, TrendingUp } from "lucide-react";
import { GuidelinesModal } from "@/components/academy/community/GuidelinesModal";
import { useHotTickers } from "@/hooks/useHotTickers";

export function TradeFloorHero() {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const hotTickers = useHotTickers();

  return (
    <>
      <div className="shrink-0 px-5 py-2">
        {/* Compact header bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-[15px] font-bold text-white tracking-[-0.01em] shrink-0">
              VAULT Community
            </h2>
            <span className="text-[12px] text-white/25 font-medium hidden sm:block">
              Trade Floor · fast, clean, and focused
            </span>
          </div>

          {/* Right — HUD chips */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Guidelines */}
            <button
              onClick={() => setGuidelinesOpen(true)}
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/55 border border-[hsl(217,25%,16%)] rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/[0.03]"
            >
              <BookOpen className="h-3 w-3" />
              Guidelines
            </button>

            {/* Reply / React badges */}
            <span className="flex items-center gap-1.5 text-[11px] text-white/30 border border-[hsl(217,25%,16%)] rounded-lg px-2.5 py-1.5">
              ↩ Reply
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-white/30 border border-[hsl(217,25%,16%)] rounded-lg px-2.5 py-1.5">
              😀 React
            </span>

            {/* Active Now */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[hsl(217,25%,16%)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[11px] font-medium text-white/40">12 Active</span>
            </div>
          </div>
        </div>

        {/* Focus strip + Hot Tickers — single compact line */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[hsl(217,25%,12%)]">
          {hotTickers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-white/15" />
              {hotTickers.slice(0, 4).map((t) => (
                <span key={t} className="text-[11px] font-mono font-semibold text-primary/50">
                  ${t}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] text-white/15 uppercase tracking-wider font-bold">Focus</span>
            <p className="text-[12px] text-white/30 font-medium">Wait for confirmation before entering.</p>
          </div>
        </div>
      </div>

      <GuidelinesModal open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
    </>
  );
}
