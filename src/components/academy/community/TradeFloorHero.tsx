import { useState } from "react";
import { Users, BookOpen, TrendingUp } from "lucide-react";
import { GuidelinesModal } from "@/components/academy/community/GuidelinesModal";
import { useHotTickers } from "@/hooks/useHotTickers";

export function TradeFloorHero() {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const hotTickers = useHotTickers();

  return (
    <>
      <div className="shrink-0 px-5 pt-4 pb-2">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            {/* Left — Title */}
            <div>
              <p className="text-[11px] font-bold text-primary/50 uppercase tracking-[0.15em] mb-1">
                Trade Floor
              </p>
              <p className="text-[14px] text-white/35 font-medium">
                Live execution. Structured setups. Disciplined traders.
              </p>
            </div>

            {/* Right — HUD chips */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
              {/* Active Now */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <Users className="h-3 w-3 text-white/20" />
                <span className="text-[12px] font-medium text-white/35">12 Active</span>
              </div>

              {/* Hot Tickers */}
              {hotTickers.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <TrendingUp className="h-3 w-3 text-white/20" />
                  <div className="flex items-center gap-1">
                    {hotTickers.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="text-[12px] font-mono font-semibold text-primary/60"
                      >
                        ${t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Guidelines */}
              <button
                onClick={() => setGuidelinesOpen(true)}
                className="flex items-center gap-1.5 text-[12px] text-white/25 hover:text-white/45 border border-white/[0.05] rounded-xl px-3 py-1.5 transition-colors hover:bg-white/[0.02]"
              >
                <BookOpen className="h-3 w-3" />
                Guidelines
              </button>
            </div>
          </div>

          {/* Today's Focus */}
          <div className="flex items-center gap-2.5 mt-4 pt-3.5 border-t border-white/[0.04]">
            <span className="text-[10px] text-white/15 uppercase tracking-wider font-bold shrink-0">
              Focus
            </span>
            <p className="text-[13px] text-white/40 font-medium">
              Wait for confirmation before entering.
            </p>
          </div>
        </div>
      </div>

      <GuidelinesModal open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
    </>
  );
}
