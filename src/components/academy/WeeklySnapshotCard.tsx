import { BarChart3 } from "lucide-react";

const DATA = {
  trades: 7,
  compliance: 94,
  mistake: "Entered before setup confirmed — skipped checklist on TSLA scalp.",
  focus: "Wait for full confirmation before entering. No exceptions.",
};

export function WeeklySnapshotCard() {
  return (
    <div className="vault-glass-card p-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">
          Weekly Performance Snapshot
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBlock label="Trades" value={String(DATA.trades)} />
        <MetricBlock label="Compliance" value={`${DATA.compliance}%`} />
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[rgba(255,255,255,0.45)]">
            Biggest Mistake
          </p>
          <p className="text-sm text-[rgba(255,255,255,0.70)] mt-1 leading-snug line-clamp-2">{DATA.mistake}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[rgba(255,255,255,0.45)]">
            Focus Next Week
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
