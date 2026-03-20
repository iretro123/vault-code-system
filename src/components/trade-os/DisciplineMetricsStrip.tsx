import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TradeEntry } from "@/hooks/useTradeLog";

interface DisciplineMetricsStripProps {
  vaultStatus: string;
  complianceRate: number;
  weeklyComplianceRate: number;
  currentStreak: number;
  todayTrades: TradeEntry[];
  lossStreak: number;
  compact?: boolean;
  className?: string;
}

function computeDisciplineScore(complianceRate: number, weeklyRate: number, lossStreak: number): number {
  const invLoss = Math.max(0, 100 - lossStreak * 25);
  return Math.round(complianceRate * 0.6 + weeklyRate * 0.25 + invLoss * 0.15);
}

function computeSessionGrade(todayTrades: TradeEntry[]): string {
  if (todayTrades.length === 0) return "—";
  const followed = todayTrades.filter((t) => t.followed_rules).length;
  const rate = followed / todayTrades.length;
  if (rate >= 0.95) return "A";
  if (rate >= 0.8) return "B";
  if (rate >= 0.6) return "C";
  if (rate >= 0.4) return "D";
  return "F";
}

export function DisciplineMetricsStrip({
  vaultStatus,
  complianceRate,
  weeklyComplianceRate,
  currentStreak,
  todayTrades,
  lossStreak,
  compact = false,
  className,
}: DisciplineMetricsStripProps) {
  const disciplineScore = useMemo(
    () => computeDisciplineScore(complianceRate, weeklyComplianceRate, lossStreak),
    [complianceRate, weeklyComplianceRate, lossStreak]
  );
  const sessionGrade = useMemo(() => computeSessionGrade(todayTrades), [todayTrades]);

  const gradeColor =
    sessionGrade === "A" ? "text-emerald-400" :
    sessionGrade === "B" ? "text-primary" :
    sessionGrade === "C" ? "text-amber-400" :
    sessionGrade === "D" || sessionGrade === "F" ? "text-red-400" :
    "text-muted-foreground/40";

  // ── Compact: inline pill strip ──
  if (compact) {
    const pills = [
      { label: "Discipline", value: `${disciplineScore}%`, color: disciplineScore >= 80 ? "text-emerald-400" : disciplineScore >= 50 ? "text-amber-400" : "text-red-400" },
      { label: "Grade", value: sessionGrade, color: gradeColor },
      { label: "Streak", value: String(currentStreak), color: currentStreak >= 5 ? "text-emerald-400" : "text-foreground/70" },
      { label: "Rules", value: `${complianceRate}%`, color: complianceRate >= 80 ? "text-emerald-400" : "text-foreground/70" },
    ];
    return (
      <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
        {pills.map((p, i) => (
          <span key={p.label} className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground/35 font-medium">{p.label}</span>
            <span className={cn("text-[10px] font-bold tabular-nums", p.color)}>{p.value}</span>
            {i < pills.length - 1 && <span className="text-muted-foreground/15 text-[8px] mx-0.5">·</span>}
          </span>
        ))}
      </div>
    );
  }

  // ── Full: card grid ──
  const sc = {
    GREEN: { dot: "bg-emerald-400", text: "text-emerald-400", label: "Clear" },
    YELLOW: { dot: "bg-amber-400", text: "text-amber-400", label: "Caution" },
    RED: { dot: "bg-red-400", text: "text-red-400", label: "Locked" },
  }[vaultStatus] || { dot: "bg-emerald-400", text: "text-emerald-400", label: "Clear" };

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-6 md:overflow-visible", className)}>
      <MetricPill label="Vault" value={sc.label} valueClass={sc.text} dot={sc.dot} />
      <MetricPill label="Discipline" value={`${disciplineScore}%`} valueClass={disciplineScore >= 80 ? "text-emerald-400" : disciplineScore >= 50 ? "text-amber-400" : "text-red-400"} />
      <MetricPill label="Grade" value={sessionGrade} valueClass={gradeColor} />
      <MetricPill label="Streak" value={currentStreak} valueClass={currentStreak >= 5 ? "text-emerald-400" : "text-foreground"} />
      <MetricPill label="Rules" value={`${complianceRate}%`} valueClass={complianceRate >= 80 ? "text-emerald-400" : "text-foreground/70"} />
      <MetricPill label="Weekly" value={`${weeklyComplianceRate}%`} valueClass={weeklyComplianceRate >= 80 ? "text-emerald-400" : "text-foreground/70"} />
    </div>
  );
}

function MetricPill({ label, value, valueClass, dot }: { label: string; value: string | number; valueClass?: string; dot?: string }) {
  return (
    <div className="vault-metric-cell flex-shrink-0 min-w-[5.5rem]">
      {dot ? (
        <div className="flex items-center justify-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          <span className={cn("text-sm font-bold tabular-nums", valueClass)}>{value}</span>
        </div>
      ) : (
        <p className={cn("text-sm font-bold tabular-nums", valueClass || "text-foreground")}>{value}</p>
      )}
      <p className="text-[8px] text-muted-foreground/40 uppercase tracking-wider font-semibold mt-0.5">{label}</p>
    </div>
  );
}
