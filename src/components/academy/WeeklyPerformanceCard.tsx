import { BarChart3 } from "lucide-react";

// Mock data — wire to real queries later
const WEEKLY_DATA = {
  trades: 7,
  ruleCompliance: 94,
  biggestMistake: "Entered before setup confirmed — skipped checklist on TSLA scalp.",
  focusNextWeek: "Wait for full confirmation before entering. No exceptions.",
};

export function WeeklyPerformanceCard() {
  return (
    <div
      className="rounded-2xl p-6 space-y-5 border border-white/[0.10]"
      style={{
        background: "rgba(255,255,255,0.07)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <BarChart3 className="h-4.5 w-4.5" style={{ color: "hsl(217,91%,60%)" }} />
        <h3 className="text-base font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
          Weekly Performance Report
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
            Trades
          </p>
          <p className="text-2xl font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>{WEEKLY_DATA.trades}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
            Rule Compliance
          </p>
          <p className="text-2xl font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
            {WEEKLY_DATA.ruleCompliance}%
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
          Biggest Mistake
        </p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{WEEKLY_DATA.biggestMistake}</p>
      </div>

      <div className="space-y-1.5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
          Focus for Next Week
        </p>
        <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
          {WEEKLY_DATA.focusNextWeek}
        </p>
      </div>
    </div>
  );
}
