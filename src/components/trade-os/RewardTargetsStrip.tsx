import { Target } from "lucide-react";

interface RewardTargetsStripProps {
  riskPerTrade: number;
  compact?: boolean;
}

export function RewardTargetsStrip({ riskPerTrade, compact }: RewardTargetsStripProps) {
  const targets = [
    { label: "Quick PT", ratio: 0.5, color: "text-foreground/70" },
    { label: "1:1", ratio: 1, color: "text-emerald-400" },
    { label: "1:2", ratio: 2, color: "text-emerald-400" },
    { label: "1:3", ratio: 3, color: "text-emerald-400" },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Target className="h-3 w-3 text-primary/70" />
        <p className="text-[9px] text-muted-foreground/50 font-semibold uppercase tracking-wider">Reward Targets</p>
      </div>
      <div className={compact ? "flex items-center gap-3" : "grid grid-cols-4 gap-2"}>
        {targets.map((t) => (
          <div key={t.label} className={compact ? "text-center" : "text-center rounded-lg bg-white/[0.03] border border-white/[0.06] py-2 px-1"}>
            <p className={`text-sm font-bold tabular-nums ${t.color}`}>
              +${(riskPerTrade * t.ratio).toFixed(0)}
            </p>
            <p className="text-[9px] text-muted-foreground/50 font-medium">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
