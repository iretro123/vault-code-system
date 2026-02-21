import { BarChart3 } from "lucide-react";

const DATA = {
  trades: 7,
  compliance: 94,
  mistake: "Skipped checklist on TSLA scalp.",
  focus: "Wait for full confirmation before entering.",
};

export function WeeklySnapshotCard() {
  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.45)]">
        Weekly Performance
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock label="Trades" value={String(DATA.trades)} />
        <MetricBlock label="Compliance" value={`${DATA.compliance}%`} />
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[rgba(255,255,255,0.45)]">
            Biggest Mistake
          </p>
          <p className="text-sm text-[rgba(255,255,255,0.70)] mt-1 leading-snug line-clamp-2">{DATA.mistake}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[rgba(255,255,255,0.45)]">
            Focus
          </p>
          <p className="text-sm font-semibold text-[rgba(255,255,255,0.92)] mt-1 leading-snug">{DATA.focus}</p>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[rgba(255,255,255,0.45)]">{label}</p>
      <p className="text-2xl font-bold text-[rgba(255,255,255,0.94)] mt-1">{value}</p>
    </div>
  );
}
