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

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
  GREEN: { dot: "bg-emerald-400", text: "text-emerald-400" },
  YELLOW: { dot: "bg-amber-400", text: "text-amber-400" },
  RED: { dot: "bg-red-400", text: "text-red-400" },
};

interface MetricPillProps {
  label: string;
  value: string | number;
  valueClass?: string;
  dot?: string;
}

function MetricPill({ label, value, valueClass, dot }: MetricPillProps) {
  return (
    <div className="flex-shrink-0 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 min-w-[5.5rem] text-center">
      {dot ? (
        <div className="flex items-center justify-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          <span className={cn("text-sm font-bold tabular-nums", valueClass)}>{value}</span>
        </div>
      ) : (
        <p className={cn("text-sm font-bold tabular-nums", valueClass || "text-foreground")}>{value}</p>
      )}
      <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider font-semibold mt-0.5">{label}</p>
    </div>
  );
}

export function DisciplineMetricsStrip({
  vaultStatus,
  complianceRate,
  weeklyComplianceRate,
  currentStreak,
  todayTrades,
  lossStreak,
  className,
}: DisciplineMetricsStripProps) {
  const disciplineScore = useMemo(
    () => computeDisciplineScore(complianceRate, weeklyComplianceRate, lossStreak),
    [complianceRate, weeklyComplianceRate, lossStreak]
  );
  const sessionGrade = useMemo(() => computeSessionGrade(todayTrades), [todayTrades]);

  const sc = STATUS_COLORS[vaultStatus] || STATUS_COLORS.GREEN;

  const gradeColor =
    sessionGrade === "A" ? "text-emerald-400" :
    sessionGrade === "B" ? "text-primary" :
    sessionGrade === "C" ? "text-amber-400" :
    sessionGrade === "D" || sessionGrade === "F" ? "text-red-400" :
    "text-muted-foreground/50";

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-6 md:overflow-visible", className)}>
      <MetricPill label="Vault Status" value={vaultStatus === "GREEN" ? "Clear" : vaultStatus === "YELLOW" ? "Caution" : "Locked"} valueClass={sc.text} dot={sc.dot} />
      <MetricPill label="Discipline" value={`${disciplineScore}%`} valueClass={disciplineScore >= 80 ? "text-emerald-400" : disciplineScore >= 50 ? "text-amber-400" : "text-red-400"} />
      <MetricPill label="Session Grade" value={sessionGrade} valueClass={gradeColor} />
      <MetricPill label="Streak" value={currentStreak} valueClass={currentStreak >= 5 ? "text-emerald-400" : "text-foreground"} />
      <MetricPill label="Rule Follow" value={`${complianceRate}%`} valueClass={complianceRate >= 80 ? "text-emerald-400" : "text-foreground/70"} />
      <MetricPill label="Weekly" value={`${weeklyComplianceRate}%`} valueClass={weeklyComplianceRate >= 80 ? "text-emerald-400" : "text-foreground/70"} />
    </div>
  );
}
