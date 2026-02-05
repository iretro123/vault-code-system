import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { VaultHUD } from "@/components/vault/VaultHUD";
import { DailyVaultGate } from "@/components/DailyVaultGate";
import { PreTradeExecutionGateV2 } from "@/components/vault/PreTradeExecutionGateV2";
import { VaultIdentityCard } from "@/components/VaultIdentityCard";
import { VaultLevelCard } from "@/components/VaultLevelCard";
import { SessionIntegrityCard } from "@/components/vault/SessionIntegrityCard";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Crosshair, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TraderCockpit() {
  const { data, loading } = useVaultExecutionPermission();
  const [open, setOpen] = useState(false);

  const vaultOpen = !!data?.vault_open;

  const tradeButtonLabel = useMemo(() => {
    if (!data) return "Intent to Trade";
    if (!data.execution_allowed) return "Blocked";
    if (data.cooldown_active) return "Cooldown Active";
    return "Intent to Trade";
  }, [data]);

  const tradeButtonDisabled = useMemo(() => {
    if (!data) return false;
    if (!data.execution_allowed) return true;
    if (data.cooldown_active) return true;
    return false;
  }, [data]);

  return (
    <AppLayout>
      <PageHeader title="Trader Cockpit" subtitle="Command center for vault-verified execution" />

      <div className="px-4 md:px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vault HUD */}
            <VaultHUD />

            {/* Daily Ritual Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Daily Ritual</h3>
                {vaultOpen && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-active bg-status-active/10 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </span>
                )}
              </div>

              {!vaultOpen ? (
                <div className="space-y-4">
                  <DailyVaultGate />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Vault is open. Trade fast — but only your best setups.
                </p>
              )}
            </Card>

            {/* Execution Section */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Crosshair className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Execution</h3>
              </div>

              <Button
                onClick={() => setOpen(true)}
                disabled={tradeButtonDisabled}
                className="w-full mb-3"
                size="lg"
              >
                {tradeButtonLabel}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                One click. Vault decides. Verified trades only.
              </p>
            </Card>
          </div>

          {/* Right rail */}
          <div className="space-y-4">
            <SessionIntegrityCard />
            <VaultIdentityCard />
            <VaultLevelCard />
          </div>
        </div>
      </div>

      {/* Intent to Trade Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Intent to Trade
            </DialogTitle>
            <DialogDescription>
              Complete the execution gate to verify your trade with the vault.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <PreTradeExecutionGateV2
              onAllowed={(riskLimit) => {
                setOpen(false);
                console.log("Vault allowed. Effective risk:", riskLimit);
                // Navigate to trade entry flow or open trade modal
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Vault authority is final. If blocked, fix the reason and try again.
          </p>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
