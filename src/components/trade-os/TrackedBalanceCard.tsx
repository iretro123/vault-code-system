import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Pencil, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackedBalanceCardProps {
  balance: number | null;
  showResetConfirm: boolean;
  resetInput: string;
  resetting: boolean;
  onToggleReset: () => void;
  onResetInputChange: (v: string) => void;
  onConfirmReset: () => void;
  showUpdateBalance: boolean;
  updateBalanceInput: string;
  updatingBalance: boolean;
  onToggleUpdate: () => void;
  onUpdateInputChange: (v: string) => void;
  onConfirmUpdate: () => void;
}

export function TrackedBalanceCard({
  balance, showResetConfirm, resetInput, resetting, onToggleReset, onResetInputChange, onConfirmReset,
  showUpdateBalance, updateBalanceInput, updatingBalance, onToggleUpdate, onUpdateInputChange, onConfirmUpdate,
}: TrackedBalanceCardProps) {
  if (balance === null) return null;

  const isExpanded = showUpdateBalance || showResetConfirm;

  return (
    <div className="vault-os-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Wallet className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-[0.1em] font-medium text-muted-foreground/50 leading-none">Tracked Balance</p>
          <p className="text-base font-bold tabular-nums text-foreground mt-0.5 leading-tight">${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <button
          onClick={onToggleUpdate}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-xl transition-all duration-100",
            showUpdateBalance ? "bg-primary/15 text-primary" : "text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
          )}
          aria-label="Update balance"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {showUpdateBalance && (
            <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
              <p className="text-xs text-foreground font-medium">What's your actual balance?</p>
              <p className="text-[11px] text-muted-foreground">We'll adjust your starting balance to keep trade math accurate.</p>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1 max-w-[160px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    className="pl-7 h-8 text-sm font-mono tabular-nums"
                    placeholder="0"
                    type="number"
                    min="0"
                    value={updateBalanceInput}
                    onChange={(e) => onUpdateInputChange(e.target.value)}
                  />
                </div>
                <Button size="sm" disabled={!updateBalanceInput || isNaN(parseFloat(updateBalanceInput)) || updatingBalance} onClick={onConfirmUpdate} className="h-8 rounded-lg">
                  {updatingBalance ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onToggleUpdate}>Cancel</Button>
              </div>
              <button onClick={onToggleReset} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-1">
                <RotateCcw className="h-2.5 w-2.5" /> Reset balance entirely
              </button>
            </div>
          )}

          {showResetConfirm && (
            <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
              <p className="text-xs text-foreground font-medium">Type <span className="font-mono text-destructive">RESET</span> to confirm</p>
              <p className="text-[11px] text-muted-foreground">This will clear your starting balance. You'll need to set a new one.</p>
              <div className="flex gap-2 items-center">
                <Input className="max-w-[120px] h-8 text-sm font-mono" placeholder="RESET" value={resetInput} onChange={(e) => onResetInputChange(e.target.value.toUpperCase())} />
                <Button size="sm" variant="destructive" disabled={resetInput !== "RESET" || resetting} onClick={onConfirmReset} className="h-8">{resetting ? "Resetting..." : "Confirm"}</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onToggleReset}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
