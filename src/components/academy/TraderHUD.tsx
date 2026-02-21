import { Shield, Flame, TrendingUp, CalendarClock, Target } from "lucide-react";

const HUD_DATA = {
  vaultScore: 87,
  ruleStreak: 12,
  weeklyCompliance: 94,
  tradesThisWeek: 7,
  nextReview: "Sun 6 PM",
};

const items = [
  { label: "Vault Score", value: String(HUD_DATA.vaultScore), icon: Target, accent: "text-primary" },
  { label: "Rule Streak", value: `${HUD_DATA.ruleStreak}d`, icon: Flame, accent: "text-amber-400" },
  { label: "Weekly Compliance", value: `${HUD_DATA.weeklyCompliance}%`, icon: Shield, accent: "text-emerald-400" },
  { label: "Trades This Week", value: String(HUD_DATA.tradesThisWeek), icon: TrendingUp, accent: "text-primary" },
  { label: "Next Review", value: HUD_DATA.nextReview, icon: CalendarClock, accent: "text-muted-foreground" },
];

export function TraderHUD() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="vault-glass-card flex items-center gap-2.5 px-4 py-2.5"
            style={{ borderRadius: 14 }}
          >
            <Icon className={`h-4 w-4 shrink-0 ${item.accent}`} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.08em] font-medium leading-none text-[rgba(255,255,255,0.50)]">
                {item.label}
              </p>
              <p className="text-sm font-bold mt-0.5 leading-tight text-[rgba(255,255,255,0.94)]">
                {item.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
