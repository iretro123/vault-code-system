import { Shield, Flame, TrendingUp, CalendarClock, Target } from "lucide-react";

// Mock data — wire to real queries later
const HUD_DATA = {
  vaultScore: 87,
  ruleStreak: 12,
  weeklyCompliance: 94,
  tradesThisWeek: 7,
  nextReview: "Sun 6 PM",
};

const items = [
  { label: "Vault Score", value: String(HUD_DATA.vaultScore), icon: Target, accent: "hsl(217,91%,60%)" },
  { label: "Rule Streak", value: `${HUD_DATA.ruleStreak}d`, icon: Flame, accent: "hsl(38,92%,50%)" },
  { label: "Weekly Compliance", value: `${HUD_DATA.weeklyCompliance}%`, icon: Shield, accent: "hsl(160,84%,39%)" },
  { label: "Trades This Week", value: String(HUD_DATA.tradesThisWeek), icon: TrendingUp, accent: "hsl(217,91%,60%)" },
  { label: "Next Review", value: HUD_DATA.nextReview, icon: CalendarClock, accent: "hsl(220,14%,45%)" },
];

export function TraderHUD() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-center gap-2.5 rounded-[14px] px-4 py-2.5"
            style={{
              background: "rgba(247,249,252,0.94)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
            }}
          >
            <Icon className="h-4 w-4 shrink-0" style={{ color: item.accent }} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.08em] font-medium leading-none" style={{ color: "hsl(220,14%,45%)" }}>
                {item.label}
              </p>
              <p className="text-sm font-bold mt-0.5 leading-tight" style={{ color: "hsl(220,25%,10%)" }}>
                {item.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
