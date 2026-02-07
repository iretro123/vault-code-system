import { useState } from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Target,
  Brain,
  Percent,
  Crosshair,
  Timer,
  ShieldAlert,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreTradeExecutionGateProps {
  onCleared: (emotionalState: number) => void;
  onCancel: () => void;
  plannedRisk: number;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
}

export function PreTradeExecutionGate({ 
  onCleared, 
  onCancel,
  plannedRisk 
}: PreTradeExecutionGateProps) {
  const { state: vaultState, loading: vaultLoading } = useVaultState();
  const { data: execData, loading: execLoading, status: execStatus } = useVaultExecutionPermission();
  const [emotionalState, setEmotionalState] = useState<number>(3);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "setup_valid",
      label: "Setup is valid",
      description: "I confirm my trade setup meets my strategy criteria",
      icon: <Target className="w-4 h-4" />,
      checked: false,
    },
    {
      id: "risk_confirmed",
      label: "Risk within limits",
      description: "My planned risk matches the adaptive risk allowance",
      icon: <Percent className="w-4 h-4" />,
      checked: false,
    },
    {
      id: "stop_loss_set",
      label: "Stop loss is set",
      description: "I have defined my stop loss before entry",
      icon: <Crosshair className="w-4 h-4" />,
      checked: false,
    },
  ]);

  const effectiveMaxRisk = execData?.effective_risk_limit ?? 1;
  const riskWithinLimit = plannedRisk <= effectiveMaxRisk;
  const isLockdown = execData?.protection_level === "LOCKDOWN";
  const hasCooldown = !!execData?.cooldown_active;
  const isInterventionRequired = !!execData?.intervention_required;
  const canTrade = vaultState.vault_status !== "RED" && vaultState.trades_remaining_today > 0 && vaultState.risk_remaining_today > 0;
  
  // Determine vault state
  const getVaultState = () => {
    if (!canTrade) return "LOCKED";
    if (isLockdown) return "LOCKED";
    if (isInterventionRequired) return "LOCKED";
    if (execData?.protection_level === "RESTRICTED" || execData?.protection_level === "CAUTION") return "CAUTION";
    if (execData?.consistency_level === "UNSTABLE" || execData?.consistency_level === "CRITICAL") return "CAUTION";
    return "READY";
  };
  
  const vaultGateState = getVaultState();
  
  // Check if all items are validated
  const allChecked = checklist.every((item) => item.checked);
  const emotionalStateValid = emotionalState >= 1 && emotionalState <= 5;
  const canProceed = allChecked && emotionalStateValid && riskWithinLimit && vaultGateState !== "LOCKED" && !hasCooldown && !isInterventionRequired;

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleProceed = () => {
    if (canProceed) {
      onCleared(emotionalState);
    }
  };

  // Loading state
  if (vaultLoading || execLoading) {
    return (
      <Card className="p-6 border-border/50">
        <div className="flex items-center justify-center gap-3">
          <Shield className="w-5 h-5 animate-pulse text-muted-foreground" />
          <span className="text-muted-foreground">Checking vault status...</span>
        </div>
      </Card>
    );
  }

  // Intervention required
  if (isInterventionRequired) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-destructive">Consistency Intervention Required</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your consistency has deteriorated to critical levels.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Focus on rebuilding consistent habits before resuming trading.
          </p>
          <Button variant="outline" onClick={onCancel} className="mt-4">
            Go Back
          </Button>
        </div>
      </Card>
    );
  }

  // Lockdown state
  if (isLockdown) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-destructive">Protection Mode: LOCKDOWN</h3>
            <p className="text-sm text-muted-foreground mt-1">{execData?.block_reason}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Stop trading immediately. Take time to reset your mental state.
          </p>
          <Button variant="outline" onClick={onCancel} className="mt-4">
            Go Back
          </Button>
        </div>
      </Card>
    );
  }

  // Vault RED — not cleared
  if (vaultState.vault_status === "RED" && !canTrade) {
    return (
      <Card className="p-6 border-white/10 bg-white/5">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Not Cleared</h3>
            <p className="text-sm text-muted-foreground mt-1">Vault is protecting discipline.</p>
          </div>
          <Button variant="outline" onClick={onCancel} className="mt-4">
            Go Back
          </Button>
        </div>
      </Card>
    );
  }

  // Standard locked state
  if (vaultGateState === "LOCKED") {
    return (
      <Card className="p-6 border-white/10 bg-white/5">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Trading Locked</h3>
            <p className="text-sm text-muted-foreground mt-1">Vault is protecting discipline.</p>
          </div>
          <div className="pt-2 space-y-2 text-sm text-muted-foreground">
            <p>{execData?.block_reason ?? "Vault discipline lock active"}</p>
          </div>
          <Button variant="outline" onClick={onCancel} className="mt-4">
            Go Back
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-border/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          vaultGateState === "CAUTION" 
            ? "bg-status-warning/10" 
            : "bg-primary/10"
        )}>
          {vaultGateState === "CAUTION" ? (
            <AlertTriangle className="w-5 h-5 text-status-warning" />
          ) : (
            <Shield className="w-5 h-5 text-primary" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">Pre-Trade Execution Gate</h3>
          <p className="text-sm text-muted-foreground">
            {vaultGateState === "CAUTION" 
              ? "Proceed with caution - limits nearly reached"
              : "Complete checklist before trade execution"
            }
          </p>
        </div>
      </div>

      {/* Cooldown Warning */}
      {hasCooldown && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive">
            <Timer className="w-4 h-4" />
            <span className="text-sm font-medium">
              Trade cooldown active: {execData?.cooldown_remaining_minutes} minutes remaining
            </span>
          </div>
        </div>
      )}

      {/* Vault Status Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6 p-3 rounded-lg bg-muted/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Trades Left</p>
          <p className="text-lg font-semibold">{vaultState.trades_remaining_today}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Risk Left</p>
          <p className="text-lg font-semibold">{vaultState.risk_remaining_today.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Effective Max Risk</p>
          <p className="text-lg font-semibold">
            {effectiveMaxRisk.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Risk Check */}
      {!riskWithinLimit && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Planned risk ({plannedRisk}%) exceeds effective limit ({effectiveMaxRisk.toFixed(2)}%)
            </span>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-3 mb-6">
        {checklist.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
              item.checked
                ? "border-primary/30 bg-primary/5"
                : "border-border/50 hover:border-border"
            )}
            onClick={() => toggleChecklistItem(item.id)}
          >
            <Checkbox
              id={item.id}
              checked={item.checked}
              onCheckedChange={() => toggleChecklistItem(item.id)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {item.icon}
                <Label htmlFor={item.id} className="font-medium cursor-pointer">
                  {item.label}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
            {item.checked && (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            )}
          </div>
        ))}
      </div>

      {/* Emotional State */}
      <div className="mb-6 p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-muted-foreground" />
          <Label className="font-medium">Emotional State (1-5)</Label>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          1 = Stressed/Anxious, 3 = Neutral, 5 = Calm/Focused
        </p>
        <div className="flex items-center gap-4">
          <Input
            type="number"
            min={1}
            max={5}
            value={emotionalState}
            onChange={(e) => setEmotionalState(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-20 text-center font-mono text-lg"
          />
          <div className="flex-1 flex justify-between text-xs text-muted-foreground">
            <span>Stressed</span>
            <span>Neutral</span>
            <span>Focused</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleProceed} 
          disabled={!canProceed}
          className="flex-1"
        >
          {hasCooldown ? "Cooldown Active" : canProceed ? "Execute Trade" : "Complete Checklist"}
        </Button>
      </div>
    </Card>
  );
}
