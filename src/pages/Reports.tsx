import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useReports } from "@/hooks/useReports";
import { RefreshCw, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  title: string;
  report: {
    period_start: string;
    period_end: string;
    days_traded: number;
    green_days: number;
    yellow_days: number;
    red_days: number;
    trades_taken: number;
    trades_blocked: number;
    block_rate: number;
    stability_score: number;
    mode_fit: string | null;
    insight_text: string | null;
  } | null;
}

function StabilityBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-emerald-400 bg-emerald-400/10"
      : score >= 50
        ? "text-amber-400 bg-amber-400/10"
        : "text-red-400 bg-red-400/10";
  return (
    <span className={cn("text-2xl font-bold tabular-nums px-3 py-1 rounded-lg", color)}>
      {score}
    </span>
  );
}

function ReportCard({ title, report }: ReportCardProps) {
  if (!report) {
    return (
      <Card className="p-6 bg-card border border-white/10">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground">No report available yet. Generate one below.</p>
      </Card>
    );
  }

  const blockPct = (report.block_rate * 100).toFixed(1);

  return (
    <Card className="p-6 bg-card border border-white/10 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {report.period_start} → {report.period_end}
        </span>
      </div>

      {/* Stability Score */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Stability</span>
        <StabilityBadge score={report.stability_score} />
      </div>

      {/* Day breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Green" value={report.green_days} color="text-emerald-400" />
        <Metric label="Yellow" value={report.yellow_days} color="text-amber-400" />
        <Metric label="Red" value={report.red_days} color="text-red-400" />
      </div>

      {/* Trade stats */}
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Taken" value={report.trades_taken} />
        <Metric label="Blocked" value={report.trades_blocked} />
        <Metric label="Block Rate" value={`${blockPct}%`} />
      </div>

      {/* Mode fit */}
      {report.mode_fit && (
        <p className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-3">
          {report.mode_fit}
        </p>
      )}

      {/* Insight */}
      {report.insight_text && (
        <p className="text-sm text-foreground/80 bg-white/5 rounded-lg px-3 py-2">
          {report.insight_text}
        </p>
      )}
    </Card>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-semibold tabular-nums", color ?? "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

const Reports = () => {
  const { user } = useAuth();
  const { weekly, monthly, loading, generating, generateOnDemand } = useReports(user?.id);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Reports"
            subtitle="Weekly and monthly performance summaries"
            icon={<FileText className="w-5 h-5 text-primary" />}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={generateOnDemand}
            disabled={generating || loading}
            className="border-white/10"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            {generating ? "Generating…" : "Refresh"}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <ReportCard title="Latest Weekly Report" report={weekly} />
            <ReportCard title="Latest Monthly Report" report={monthly} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Reports;
