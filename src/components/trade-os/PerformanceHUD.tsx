import {
  Wallet, ArrowUpRight, ArrowDownRight, Target, Activity, Shield, Flame,
} from "lucide-react";

interface PerformanceHUDProps {
  balance: number | null;
  todayPnl: number;
  allTimeWinRate: number;
  totalTrades: number;
  complianceRate: number;
  currentStreak: number;
}

export function PerformanceHUD({
  balance, todayPnl, allTimeWinRate, totalTrades, complianceRate, currentStreak,
}: PerformanceHUDProps) {
  const hudItems = [
    {
      label: "BALANCE",
      value: balance !== null ? `$${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
      icon: Wallet,
      accent: "text-primary",
      large: true,
    },
    {
      label: "TODAY P/L",
      value: todayPnl === 0 ? "$0" : todayPnl > 0 ? `+$${todayPnl.toFixed(0)}` : `-$${Math.abs(todayPnl).toFixed(0)}`,
      icon: todayPnl >= 0 ? ArrowUpRight : ArrowDownRight,
      accent: todayPnl > 0 ? "text-emerald-400" : todayPnl < 0 ? "text-red-400" : "text-muted-foreground",
    },
    {
      label: "WIN RATE",
      value: `${allTimeWinRate}%`,
      icon: Target,
      accent: allTimeWinRate >= 50 ? "text-emerald-400" : "text-amber-400",
    },
    {
      label: "TRADES",
      value: String(totalTrades),
      icon: Activity,
      accent: "text-primary",
    },
    {
      label: "RULES",
      value: `${complianceRate}%`,
      icon: Shield,
      accent: complianceRate >= 80 ? "text-emerald-400" : "text-amber-400",
    },
    {
      label: "STREAK",
      value: `${currentStreak}`,
      icon: Flame,
      accent: currentStreak >= 5 ? "text-emerald-400" : currentStreak >= 2 ? "text-amber-400" : "text-muted-foreground",
    },
  ];

  return (
    <div className="vault-os-card overflow-hidden p-1">
      <div className="relative grid grid-cols-3 md:grid-cols-6 gap-px rounded-xl overflow-hidden bg-border/20">
        {hudItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-card px-2.5 py-2.5 md:px-4 md:py-4 flex flex-col items-center text-center gap-0.5 transition-colors duration-100 hover:bg-white/[0.03]"
            >
              <Icon className={`h-3.5 w-3.5 ${item.accent} shrink-0`} />
              <span className="text-[9px] uppercase tracking-[0.1em] font-medium text-muted-foreground/70 leading-none">{item.label}</span>
              <span className={`text-base md:text-lg font-bold tabular-nums leading-none ${item.large ? item.accent : "text-foreground"}`}>
                {item.value}
              </span>
              {item.label === "STREAK" && currentStreak >= 5 && (
                <span className="text-[8px] text-emerald-400/80 font-medium">🔥 On fire</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
