import { useState } from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Lock, 
  CheckCircle2, 
  Target,
  Percent,
  Crosshair,
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
      description: "My planned risk is within Vault allowance",
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

  // Only Vault State controls access
  const canTrade = vaultState.vault_status !== "RED" && !vaultState.open_trade && vaultState.trades_remaining_today > 0 && vaultState.risk_remaining_today > 0;
  const allChecked = checklist.every((item) => item.checked);
  const canProceed = allChecked && canTrade;

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleProceed = () => {
    if (canProceed) {
      onCleared(3); // Default neutral emotional state
    }
  };

  if (vaultLoading) {
    return (
      <Card className="p-6 border-border/50">
        <div className="flex items-center justify-center gap-3">
          <Shield className="w-5 h-5 animate-pulse text-muted-foreground" />
          <span className="text-muted-foreground">Checking vault status...</span>
        </div>
      </Card>
    );
  }

  // Not cleared — Vault State says no
  if (!canTrade) {
    return (
      <Card className="p-6 border-white/10 bg-white/5">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
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

  return (
    <Card className="p-6 border-border/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Pre-Trade Checklist</h3>
          <p className="text-sm text-muted-foreground">
            Complete checklist before trade execution
          </p>
        </div>
      </div>

      {/* Vault Status Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6 p-3 rounded-lg bg-muted/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Trades Left</p>
          <p className="text-lg font-semibold">{vaultState.trades_remaining_today}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Risk Left</p>
          <p className="text-lg font-semibold">${vaultState.risk_remaining_today.toFixed(0)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Max Contracts</p>
          <p className="text-lg font-semibold">{vaultState.max_contracts_allowed}</p>
        </div>
      </div>

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
          {canProceed ? "Execute Trade" : "Complete Checklist"}
        </Button>
      </div>
    </Card>
  );
}
