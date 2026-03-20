import { cn } from "@/lib/utils";

interface LiveSessionMetricsProps {
  dailyLossBuffer: number;
  riskPerTrade: number;
  maxContracts: number;
  tradesRemaining: number;
  lossStreak: number;
  maxLossesPerDay: number;
}

export function LiveSessionMetrics({
  dailyLossBuffer,
  riskPerTrade,
  maxContracts,
  tradesRemaining,
  lossStreak,
  maxLossesPerDay,
}: LiveSessionMetricsProps) {
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
        <div key={m.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
          <p className={cn(
            "text-lg font-bold tabular-nums",
            m.warn ? "text-red-400" : "text-foreground"
          )}>
            {m.value}
          </p>
          <p className="text-[9px] text-muted-foreground/50 font-medium">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
