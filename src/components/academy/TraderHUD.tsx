import { Card } from "@/components/ui/card";
import { Flame, ShieldCheck, TrendingUp, CalendarClock } from "lucide-react";

// Mock data — wire to real queries later
const HUD_DATA = {
  ruleStreak: 12,
  weeklyCompliance: 94,
  tradesThisWeek: 7,
  nextReview: "Sun 6:00 PM",
};

const items = [
  {
    label: "Rule Streak",
    value: `${HUD_DATA.ruleStreak}d`,
    icon: Flame,
    accent: "text-amber-400",
  },
  {
    label: "Weekly Compliance",
    value: `${HUD_DATA.weeklyCompliance}%`,
    icon: ShieldCheck,
    accent: "text-emerald-400",
  },
  {
    label: "Trades This Week",
    value: String(HUD_DATA.tradesThisWeek),
    icon: TrendingUp,
    accent: "text-primary",
  },
  {
    label: "Next Review",
    value: HUD_DATA.nextReview,
    icon: CalendarClock,
    accent: "text-muted-foreground",
  },
];

export function TraderHUD() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.label}
            className="vault-card px-3 py-2.5 flex items-center gap-2.5"
          >
            <Icon className={`h-4 w-4 shrink-0 ${item.accent}`} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
                {item.label}
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5 leading-tight">
                {item.value}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
