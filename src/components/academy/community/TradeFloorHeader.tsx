import { Users, BookOpen, Flame, ClipboardCheck, TrendingUp } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { GuidelinesModal } from "@/components/academy/community/GuidelinesModal";
import { supabase } from "@/integrations/supabase/client";

/* ── Mention-based hot tickers ── */
const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;

function useHotTickers() {
  const [tickers, setTickers] = useState<string[]>([]);

  const fetch = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("academy_messages")
        .select("body")
        .eq("room_slug", "trade-floor")
        .eq("is_deleted", false)
        .gte("created_at", since)
        .limit(200);

      if (!data) return;

      const counts = new Map<string, number>();
      for (const msg of data) {
        const matches = msg.body.matchAll(TICKER_REGEX);
        for (const m of matches) {
          const t = m[1];
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }

      const sorted = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t]) => t);

      setTickers(sorted);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetch]);

  return tickers;
}

export function TradeFloorHeader() {
  const [activeCount] = useState(12);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const hotTickers = useHotTickers();

  return (
    <>
      <div className="shrink-0 w-full px-4 py-3">
        <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.07] backdrop-blur-md px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]">
          {/* Top row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left — Subtitle */}
            <div className="flex items-center gap-3 min-w-0">
              <div>
                <p className="text-[10px] font-bold text-primary/50 uppercase tracking-[0.15em] mb-0.5">
                  Trade Floor
                </p>
                <p className="text-[13px] text-white/40 font-medium truncate">
                  Live execution. Structured setups. Disciplined traders.
                </p>
              </div>
            </div>

            {/* Right — Metrics + Guidelines */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Active Now */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                  <span className="relative rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-xs font-medium text-white/40">{activeCount}</span>
                </div>
              </div>

              {/* Streak */}
              <div className="hidden md:flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-orange-400/60" />
                <span className="text-xs font-medium text-white/40">5d streak</span>
              </div>

              {/* Review */}
              <div className="hidden md:flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5 text-white/25" />
                <span className="text-xs text-white/30">Review due</span>
              </div>

              {/* Guidelines */}
              <button
                onClick={() => setGuidelinesOpen(true)}
                className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50 border border-white/[0.08] rounded-xl px-3 py-1.5 transition-colors hover:bg-white/[0.03]"
              >
                <BookOpen className="h-3 w-3" />
                Guidelines
              </button>
            </div>
          </div>

          {/* Hot tickers row */}
          {hotTickers.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
              <TrendingUp className="h-3 w-3 text-white/20 shrink-0" />
              <span className="text-[10px] text-white/20 uppercase tracking-wider font-semibold shrink-0">
                Hot Today
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {hotTickers.map((t) => (
                  <span
                    key={t}
                    className="text-[12px] font-mono font-semibold text-primary/70 bg-primary/[0.06] border border-primary/[0.10] rounded-lg px-2 py-0.5 shrink-0"
                  >
                    ${t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Today's Focus */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
            <BookOpen className="h-3 w-3 text-white/20 shrink-0" />
            <span className="text-[10px] text-white/20 uppercase tracking-wider font-semibold shrink-0">
              Focus
            </span>
            <p className="text-[12px] text-white/45 font-medium">
              Wait for confirmation before entering.
            </p>
          </div>
        </div>
      </div>

      <GuidelinesModal open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
    </>
  );
}
