import React, { useMemo, useState } from "react";
import { VaultHUD } from "@/components/vault/VaultHUD";
import { DailyVaultGate } from "@/components/DailyVaultGate";
import { PreTradeExecutionGateV2 } from "@/components/vault/PreTradeExecutionGateV2";
import { VaultIdentityCard } from "@/components/VaultIdentityCard";
import { VaultLevelCard } from "@/components/VaultLevelCard";
import { SessionIntegrityCard } from "@/components/vault/SessionIntegrityCard";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Crosshair, Shield, LogIn, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function TraderCockpit() {
  const { user, loading: authLoading } = useAuth();
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

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Shield className="h-12 w-12 text-primary mb-4" />
        <h1 className="text-xl font-semibold mb-2">Trader Cockpit</h1>
        <p className="text-muted-foreground mb-6 max-w-xs">
          Sign in to access your vault-verified trading command center.
        </p>
        <Link to="/auth">
          <Button className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact header */}
      <header className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm tracking-tight">VAULT COCKPIT</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Keep open next to charts
          </span>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Vault HUD - Primary status */}
        <VaultHUD />

        {/* Daily Ritual */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Daily Ritual</span>
            {vaultOpen && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-status-active">
                <CheckCircle2 className="h-3 w-3" />
                Done
              </span>
            )}
          </div>

          {!vaultOpen ? (
            <DailyVaultGate />
          ) : (
            <p className="text-sm text-muted-foreground">
              Vault open. Trade your best setups only.
            </p>
          )}
        </Card>

        {/* Execution */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crosshair className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Execution</span>
          </div>

          <Button
            onClick={() => setOpen(true)}
            disabled={tradeButtonDisabled}
            className="w-full"
            size="lg"
          >
            {tradeButtonLabel}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-2">
            One click. Vault decides.
          </p>
        </Card>

        {/* Session Integrity */}
        <SessionIntegrityCard />

        {/* Identity & Level - Compact grid */}
        <div className="grid grid-cols-2 gap-3">
          <VaultIdentityCard />
          <VaultLevelCard />
        </div>
      </main>

      {/* Intent to Trade Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Intent to Trade
            </DialogTitle>
            <DialogDescription>
              Complete the execution gate to verify your trade.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <PreTradeExecutionGateV2
              onAllowed={(riskLimit) => {
                setOpen(false);
                console.log("Vault allowed. Effective risk:", riskLimit);
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Vault authority is final.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
