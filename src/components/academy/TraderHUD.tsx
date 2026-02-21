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
            className="flex items-center gap-2.5 rounded-[14px] px-4 py-2.5 border border-white/[0.10]"
            style={{
              background: "rgba(255,255,255,0.06)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            <Icon className="h-4 w-4 shrink-0" style={{ color: item.accent }} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.08em] font-medium leading-none" style={{ color: "rgba(255,255,255,0.55)" }}>
                {item.label}
              </p>
              <p className="text-sm font-bold mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
                {item.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
