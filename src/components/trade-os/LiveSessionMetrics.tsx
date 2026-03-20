import { cn } from "@/lib/utils";

interface LiveSessionMetricsProps {
  dailyLossBuffer: number;
  riskPerTrade: number;
  maxContracts: number;
  tradesRemaining: number;
  lossStreak: number;
  maxLossesPerDay: number;
  variant?: "grid" | "compact";
  rewardTargets?: { riskPerTrade: number };
}

export function LiveSessionMetrics({
  dailyLossBuffer,
  riskPerTrade,
  maxContracts,
  tradesRemaining,
  lossStreak,
  maxLossesPerDay,
  variant = "grid",
  rewardTargets,
}: LiveSessionMetricsProps) {
  // ── Compact: 2×2 core metrics inside a single card ──
  if (variant === "compact") {
    const metrics = [
      { label: "Daily Buffer", value: `$${dailyLossBuffer.toFixed(0)}`, warn: dailyLossBuffer <= 0 },
      { label: "Risk / Trade", value: `$${riskPerTrade.toFixed(0)}`, warn: false },
      { label: "Trades Left", value: String(tradesRemaining), warn: tradesRemaining <= 0 },
      { label: "Max Contracts", value: String(maxContracts), warn: false },
    ];

    const targets = rewardTargets ? [
      { label: "Quick PT", ratio: 0.5 },
      { label: "1:1", ratio: 1 },
      { label: "1:2", ratio: 2 },
      { label: "1:3", ratio: 3 },
    ] : null;

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="vault-metric-cell">
              <p className={cn(
                "text-lg font-bold tabular-nums",
                m.warn ? "text-red-400" : "text-foreground"
              )}>
                {m.value}
              </p>
              <p className="text-[8px] text-muted-foreground/40 font-semibold uppercase tracking-wider mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
        {targets && (
          <div className="flex items-center justify-between px-1">
            {targets.map((t) => (
              <div key={t.label} className="text-center">
                <p className="text-[11px] font-bold tabular-nums text-emerald-400/70">
                  +${(rewardTargets!.riskPerTrade * t.ratio).toFixed(0)}
                </p>
                <p className="text-[8px] text-muted-foreground/30 font-medium">{t.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Grid: original 3×2 layout ──
  const metrics = [
    { label: "Daily Buffer", value: `$${dailyLossBuffer.toFixed(0)}`, warn: dailyLossBuffer <= 0 },
    { label: "Risk / Trade", value: `$${riskPerTrade.toFixed(0)}`, warn: false },
    { label: "Max Contracts", value: String(maxContracts), warn: false },
    { label: "Trades Left", value: String(tradesRemaining), warn: tradesRemaining <= 0 },
    { label: "Loss Streak", value: String(lossStreak), warn: lossStreak >= maxLossesPerDay },
    { label: "Stop Rule", value: `After ${maxLossesPerDay}L`, warn: false },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {metrics.map((m) => (
        <div key={m.label} className="vault-metric-cell">
          <p className={cn(
            "text-lg font-bold tabular-nums",
            m.warn ? "text-red-400" : "text-foreground"
          )}>
            {m.value}
          </p>
          <p className="text-[8px] text-muted-foreground/40 font-semibold uppercase tracking-wider mt-0.5">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
