import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, X, Loader2, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

const OUTCOME_STYLES = {
  win: { label: "Win", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: TrendingUp },
  loss: { label: "Loss", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: TrendingDown },
  breakeven: { label: "Breakeven", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Minus },
};

const MOBILE_LIMIT = 15;

interface RecentTradesSectionProps {
  entries: { id: string; trade_date: string; risk_used: number; risk_reward: number; followed_rules: boolean; notes: string | null; created_at: string; symbol?: string; outcome?: string; plan_id?: string }[];
  onExportCSV: () => void;
  onDelete: (id: string) => Promise<{ error: any }>;
}

export function RecentTradesSection({ entries, onExportCSV, onDelete }: RecentTradesSectionProps) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (entries.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Trade Journal</h3>
        <div className="vault-glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No trades logged yet. Use the + Log Trade button to get started.</p>
        </div>
      </div>
    );
  }

  const defaultLimit = isMobile ? MOBILE_LIMIT : 25;
  const showToggle = entries.length > defaultLimit;
  const visibleEntries = expanded ? entries : entries.slice(0, defaultLimit);

  const handleDeleteConfirm = async (id: string) => {
    setIsDeleting(true);
    await onDelete(id);
    setIsDeleting(false);
    setDeletingId(null);
    setConfirmText("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Trade Journal</h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">{entries.length} total trades</span>
      </div>
      <div className="space-y-2">
        {visibleEntries.map((e) => {
          const outcome: "win" | "loss" | "breakeven" = e.risk_reward > 0 ? "win" : e.risk_reward < 0 ? "loss" : "breakeven";
          const s = OUTCOME_STYLES[outcome];
          const Icon = s.icon;
          const pnlNum = e.risk_reward * e.risk_used;
          const pnlStr = pnlNum >= 0 ? `+$${Math.abs(pnlNum).toFixed(0)}` : `-$${Math.abs(pnlNum).toFixed(0)}`;
          const ticker = e.symbol || e.notes?.split(" ")[0] || "Trade";

          const noteParts = e.notes?.split(" | ") || [];
          const directionPart = noteParts[0]?.split(" ")[1];
          const setupPart = noteParts.find((p) => p.startsWith("Setup:"))?.replace("Setup: ", "");
          const targetPart = noteParts.find((p) => p.startsWith("Target:"))?.replace("Target: ", "");
          const stopPart = noteParts.find((p) => p.startsWith("Stop:"))?.replace("Stop: ", "");
          const isDeleteMode = deletingId === e.id;

          return (
            <div key={e.id} className="vault-glass-card p-4 space-y-2 relative group">
              {!isDeleteMode && (
                <button
                  onClick={() => { setDeletingId(e.id); setConfirmText(""); }}
                  className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-100 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Delete trade"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap pr-8">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`h-3.5 w-3.5 ${s.color} shrink-0`} />
                  <span className="text-sm font-bold text-foreground">{ticker}</span>
                  {directionPart && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 text-muted-foreground">{directionPart}</span>
                  )}
                  <span className="text-xs text-muted-foreground">· {format(new Date(e.trade_date), "MMM d")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.color}`}>{s.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${s.color}`}>{pnlStr}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                  e.plan_id
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}>
                  {e.plan_id ? "Planned" : "Unplanned"}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
                  {e.followed_rules ? "✅" : "❌"} Plan
                </span>
                {targetPart && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
                    🎯 {targetPart}
                  </span>
                )}
                {stopPart && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
                    🛑 Stop: {stopPart}
                  </span>
                )}
                {setupPart && setupPart !== "—" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary">
                    {setupPart}
                  </span>
                )}
              </div>

              {isDeleteMode && (
                <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2 mt-1">
                  <p className="text-xs text-foreground font-medium">Type <span className="font-mono text-destructive">DELETE</span> to confirm</p>
                  <p className="text-[11px] text-muted-foreground">This action is permanent and cannot be undone.</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      className="max-w-[120px] h-8 text-sm font-mono"
                      placeholder="DELETE"
                      value={confirmText}
                      onChange={(ev) => setConfirmText(ev.target.value.toUpperCase())}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={confirmText !== "DELETE" || isDeleting}
                      onClick={() => handleDeleteConfirm(e.id)}
                      className="h-8"
                    >
                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setDeletingId(null); setConfirmText(""); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showToggle && (
        <Button variant="ghost" size="sm" className="w-full text-xs text-primary gap-1.5" onClick={() => setExpanded(!expanded)}>
          {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {entries.length} trades</>}
        </Button>
      )}

      <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={onExportCSV}>
        <Download className="h-3 w-3" /> Export All Trades (CSV)
      </Button>
    </div>
  );
}
