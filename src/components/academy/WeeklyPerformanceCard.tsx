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
      className="rounded-2xl p-6 space-y-5"
      style={{
        background: "rgba(247,249,252,0.94)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <BarChart3 className="h-4.5 w-4.5" style={{ color: "hsl(217,91%,60%)" }} />
        <h3 className="text-base font-bold" style={{ color: "hsl(220,25%,10%)" }}>
          Weekly Performance Report
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: "hsl(220,14%,45%)" }}>
            Trades
          </p>
          <p className="text-2xl font-bold" style={{ color: "hsl(220,25%,10%)" }}>{WEEKLY_DATA.trades}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: "hsl(220,14%,45%)" }}>
            Rule Compliance
          </p>
          <p className="text-2xl font-bold" style={{ color: "hsl(220,25%,10%)" }}>
            {WEEKLY_DATA.ruleCompliance}%
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: "hsl(220,14%,45%)" }}>
          Biggest Mistake
        </p>
        <p className="text-sm" style={{ color: "hsl(220,15%,25%)" }}>{WEEKLY_DATA.biggestMistake}</p>
      </div>

      <div className="space-y-1.5 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <p className="text-[10px] uppercase tracking-[0.08em] font-medium" style={{ color: "hsl(220,14%,45%)" }}>
          Focus for Next Week
        </p>
        <p className="text-sm font-semibold" style={{ color: "hsl(220,25%,10%)" }}>
          {WEEKLY_DATA.focusNextWeek}
        </p>
      </div>
    </div>
  );
}
