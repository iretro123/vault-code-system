import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Loader2,
  Lock
} from "lucide-react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { usePreTradeCheck } from "@/hooks/usePreTradeCheck";

interface PreTradeCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusIndicator({ 
  label, 
  value, 
  status,
  subtitle
}: { 
  label: string; 
  value: string | number; 
  status: "ok" | "warning" | "error" | "neutral";
  subtitle?: string;
}) {
  const statusColors = {
    ok: "text-status-active border-status-active/30 bg-status-active/5",
    warning: "text-status-warning border-status-warning/30 bg-status-warning/5",
    error: "text-status-inactive border-status-inactive/30 bg-status-inactive/5",
    neutral: "text-muted-foreground border-white/10 bg-white/5",
  };
  
  const StatusIcon = status === "ok" ? CheckCircle2 : status === "warning" ? AlertTriangle : status === "neutral" ? Lock : XCircle;

  return (
    <div className={cn(
      "flex flex-col p-3 rounded-lg border transition-all",
      statusColors[status]
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold">{value}</span>
          <StatusIcon className="w-4 h-4" />
        </div>
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export function PreTradeCheckModal({ open, onOpenChange }: PreTradeCheckModalProps) {
  const { state: vaultState, loading: vaultLoading } = useVaultState();
  const { saveCheck, saving } = usePreTradeCheck();
  
  const [plannedRisk, setPlannedRisk] = useState("");
  const [checkResult, setCheckResult] = useState<"pending" | "cleared" | "violation">("pending");
  const [violationReason, setViolationReason] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPlannedRisk("");
      setCheckResult("pending");
      setViolationReason(null);
    }
  }, [open]);

  const canTrade = vaultState.vault_status !== "RED" && vaultState.trades_remaining_today > 0 && vaultState.risk_remaining_today > 0;
  const maxRiskAllowed = vaultState.risk_remaining_today;
  const tradesRemaining = vaultState.trades_remaining_today;
  const dailyLossRemaining = vaultState.risk_remaining_today;
  const plannedRiskNum = parseFloat(plannedRisk) || 0;

  const hasRiskViolation = plannedRiskNum > maxRiskAllowed;
  const hasTradesViolation = tradesRemaining <= 0;
  const hasDailyLossViolation = plannedRiskNum > dailyLossRemaining;
  const hasAnyViolation = !canTrade || hasRiskViolation || hasTradesViolation || hasDailyLossViolation;

  async function handleRunCheck() {
    const result = await saveCheck({
      disciplineScore: 0,
      canTrade,
      plannedRisk: plannedRiskNum,
      maxRiskAllowed,
      tradesRemaining,
      dailyLossRemaining,
    });

    setCheckResult(result.isCleared ? "cleared" : "violation");
    setViolationReason(result.violationReason);
  }

  if (vaultLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-b from-primary/10 to-transparent border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Pre-Trade Check</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Control Center</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Status</p>
            <div className="grid gap-2">
              <StatusIndicator
                label="Vault Status"
                value={vaultState.vault_status}
                status={vaultState.vault_status === "GREEN" ? "ok" : vaultState.vault_status === "YELLOW" ? "warning" : "error"}
              />
              <StatusIndicator
                label="Trading Status"
                value={canTrade ? "ACTIVE" : "LOCKED"}
                status={canTrade ? "ok" : "neutral"}
                subtitle={!canTrade ? "Vault is protecting discipline." : undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today's Limits</p>
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-3 text-center">
                <Target className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-mono font-bold">${vaultState.risk_remaining_today.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Risk Left</p>
              </Card>
              <Card className="p-3 text-center">
                <TrendingUp className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-mono font-bold">{tradesRemaining}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Trades Left</p>
              </Card>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Planned Trade</p>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={plannedRisk}
                onChange={(e) => setPlannedRisk(e.target.value)}
                className={cn(
                  "text-lg font-mono pr-8 h-12 transition-colors",
                  hasRiskViolation && plannedRisk && "border-status-inactive focus-visible:ring-status-inactive"
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
            </div>
            {plannedRisk && hasRiskViolation && (
              <p className="text-xs text-status-inactive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Exceeds remaining risk (${maxRiskAllowed.toFixed(0)})
              </p>
            )}
          </div>

          {checkResult !== "pending" && (
            <Card className={cn(
              "p-4 border-2 transition-all animate-slide-up",
              checkResult === "cleared" 
                ? "border-status-active/50 bg-status-active/10" 
                : "border-status-inactive/50 bg-status-inactive/10"
            )}>
              <div className="flex items-start gap-3">
                {checkResult === "cleared" ? (
                  <CheckCircle2 className="w-6 h-6 text-status-active shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-status-inactive shrink-0" />
                )}
                <div>
                  <p className={cn(
                    "font-semibold",
                    checkResult === "cleared" ? "text-status-active" : "text-status-inactive"
                  )}>
                    {checkResult === "cleared" 
                      ? "You are cleared to trade." 
                      : "This trade violates your limits."}
                  </p>
                  {violationReason && (
                    <p className="text-xs text-muted-foreground mt-1">{violationReason}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Button
            className="w-full h-12 font-medium"
            onClick={handleRunCheck}
            disabled={saving || !plannedRisk || plannedRiskNum <= 0}
            variant={hasAnyViolation && plannedRisk ? "destructive" : "default"}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Check...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Run Pre-Trade Check
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
