import { useState } from "react";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DATA = {
  trades: 7,
  compliance: 94,
  mistake: "Entered before setup confirmed — skipped checklist on TSLA scalp.",
  focus: "Wait for full confirmation before entering. No exceptions.",
};

export function WeeklySnapshotCard() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="vault-glass-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">
            Weekly Performance Snapshot
          </h3>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[rgba(255,255,255,0.45)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[rgba(255,255,255,0.45)]" />
        )}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-5">
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

          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-semibold text-primary hover:text-primary"
            onClick={() => navigate("/academy/progress")}
          >
            View Full Review
          </Button>
        </div>
      )}
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
