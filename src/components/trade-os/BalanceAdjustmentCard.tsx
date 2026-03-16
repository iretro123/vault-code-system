import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, Minus, Pencil, RotateCcw, Loader2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { BalanceAdjustment } from "@/hooks/useBalanceAdjustments";
import { format } from "date-fns";

type Mode = null | "add" | "withdraw" | "reset";

interface BalanceAdjustmentCardProps {
  balance: number | null;
  onAddFunds: (amount: number, note: string) => Promise<boolean>;
  onWithdraw: (amount: number, note: string) => Promise<boolean>;
  onReset: () => Promise<void>;
  onDeleteAdjustment: (id: string) => Promise<boolean>;
  adjustments: BalanceAdjustment[];
  resetting: boolean;
}

export function BalanceAdjustmentCard({
  balance, onAddFunds, onWithdraw, onReset, onDeleteAdjustment, adjustments, resetting,
}: BalanceAdjustmentCardProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  if (balance === null) return null;

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    setSaving(true);
    const ok = mode === "add"
      ? await onAddFunds(val, note)
      : await onWithdraw(val, note);
    setSaving(false);
    if (ok) { setMode(null); setAmount(""); setNote(""); }
  };

  const handleReset = async () => {
    if (resetInput !== "RESET") return;
    await onReset();
    setMode(null);
    setResetInput("");
  };

  const recentAdjustments = adjustments.slice(-10).reverse();

  return (
    <div className="vault-os-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Wallet className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-[0.1em] font-medium text-muted-foreground/50 leading-none">Tracked Balance</p>
          <p className="text-base font-bold tabular-nums text-foreground mt-0.5 leading-tight">
            ${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode(mode === "add" ? null : "add")}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-xl transition-all duration-100",
              mode === "add" ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground/40 hover:text-emerald-400 hover:bg-emerald-500/10"
            )}
            aria-label="Add funds"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setMode(mode === "withdraw" ? null : "withdraw")}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-xl transition-all duration-100",
              mode === "withdraw" ? "bg-amber-500/15 text-amber-400" : "text-muted-foreground/40 hover:text-amber-400 hover:bg-amber-500/10"
            )}
            aria-label="Withdraw funds"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Add / Withdraw form */}
      {(mode === "add" || mode === "withdraw") && (
        <div className="px-4 pb-4">
          <div className={cn(
            "p-3 rounded-xl border space-y-2",
            mode === "add" ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"
          )}>
            <p className="text-xs text-foreground font-medium">
              {mode === "add" ? "How much are you depositing?" : "How much are you withdrawing?"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {mode === "add"
                ? "This tracks a deposit into your real trading account — your trade stats stay accurate."
                : "This tracks a withdrawal from your real trading account."}
            </p>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 max-w-[160px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  className="pl-7 h-8 text-sm font-mono tabular-nums"
                  placeholder="0"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Input
                className="flex-1 h-8 text-sm"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-center">
              <Button
                size="sm"
                disabled={!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || saving}
                onClick={handleSubmit}
                className="h-8 rounded-lg"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : mode === "add" ? "Add Funds" : "Withdraw"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setMode(null); setAmount(""); setNote(""); }}>
                Cancel
              </Button>
            </div>
            <button
              onClick={() => setMode("reset")}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-1"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Reset balance entirely
            </button>
          </div>
        </div>
      )}

      {/* Reset confirm */}
      {mode === "reset" && (
        <div className="px-4 pb-4">
          <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
            <p className="text-xs text-foreground font-medium">Type <span className="font-mono text-destructive">RESET</span> to confirm</p>
            <p className="text-[11px] text-muted-foreground">This will clear your starting balance. You'll need to set a new one.</p>
            <div className="flex gap-2 items-center">
              <Input className="max-w-[120px] h-8 text-sm font-mono" placeholder="RESET" value={resetInput} onChange={(e) => setResetInput(e.target.value.toUpperCase())} />
              <Button size="sm" variant="destructive" disabled={resetInput !== "RESET" || resetting} onClick={handleReset} className="h-8">
                {resetting ? "Resetting..." : "Confirm"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setMode(null); setResetInput(""); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment history */}
      {recentAdjustments.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 border-t border-white/[0.06] text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <span className="uppercase tracking-widest font-medium">Recent Adjustments ({recentAdjustments.length})</span>
            {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-3 space-y-1">
              {recentAdjustments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "text-xs font-semibold tabular-nums",
                      Number(a.amount) >= 0 ? "text-emerald-400" : "text-amber-400"
                    )}>
                      {Number(a.amount) >= 0 ? "+" : ""}{Number(a.amount).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                    </span>
                    {a.note && <span className="text-[10px] text-muted-foreground/50 truncate">{a.note}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                      {(() => { try { return format(new Date(a.adjustment_date + "T12:00:00"), "MMM d"); } catch { return a.adjustment_date; } })()}
                    </span>
                    <button
                      onClick={() => onDeleteAdjustment(a.id)}
                      className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Delete adjustment"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
