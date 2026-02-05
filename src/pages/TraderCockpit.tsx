import React, { useMemo, useState } from "react";
import { VaultHUD } from "@/components/vault/VaultHUD";
import { DailyVaultGate } from "@/components/DailyVaultGate";
import { PreTradeExecutionGateV2 } from "@/components/vault/PreTradeExecutionGateV2";
import { VaultIdentityCard } from "@/components/VaultIdentityCard";
import { VaultLevelCard } from "@/components/VaultLevelCard";
import { SessionIntegrityCard } from "@/components/vault/SessionIntegrityCard";
import { FocusSessionCard } from "@/components/vault/FocusSessionCard";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TraderCockpit() {
  const { data, loading } = useVaultExecutionPermission();
  const [intentOpen, setIntentOpen] = useState(false);

  const vaultOpen = !!data?.vault_open;
  const blocked = !!data && !data.execution_allowed;
  const cooldown = !!data?.cooldown_active;

  const ctaLabel = useMemo(() => {
    if (loading) return "Checking Vault…";
    if (blocked) return "Blocked";
    if (cooldown) return "Cooldown Active";
    return "Intent to Trade";
  }, [loading, blocked, cooldown]);

  const ctaDisabled = useMemo(() => {
    if (loading) return true;
    if (blocked) return true;
    if (cooldown) return true;
    return false;
  }, [loading, blocked, cooldown]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Minimal action column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Daily Ritual Card */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Daily Ritual
                </h2>
                {vaultOpen && (
                  <span className="text-xs font-medium text-status-active bg-status-active/10 px-2 py-1 rounded-full">
                    Completed ✅
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

            {/* Execution Card */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Execution
                </h2>
                {data?.effective_risk_limit != null && (
                  <span className="text-xs text-muted-foreground">
                    Risk:{" "}
                    <span className="font-mono text-foreground">
                      {data.effective_risk_limit.toFixed(2)}%
                    </span>
                  </span>
                )}
              </div>

              <Button
                disabled={ctaDisabled}
                className="w-full mb-4"
                size="lg"
                onClick={() => setIntentOpen(true)}
              >
                {ctaLabel}
              </Button>

              {/* If blocked, show reason */}
              {!loading && blocked && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 mb-4">
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1">
                    Blocked
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data?.block_reason ?? "Not allowed right now."}
                  </p>
                </div>
              )}

              {!loading && cooldown && (
                <div className="p-3 rounded-lg border border-status-warning/30 bg-status-warning/5 mb-4">
                  <p className="text-sm text-status-warning">
                    Cooldown active — wait {data?.cooldown_remaining_minutes ?? "…"} min.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                One click. Vault decides. Verified trades only.
              </p>
            </Card>
          </div>

          {/* RIGHT: Sticky side panel */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <VaultHUD />
            <FocusSessionCard />
            <SessionIntegrityCard />
            <VaultIdentityCard />
            <VaultLevelCard />
          </div>
        </div>
      </div>

      {/* Minimal modal */}
      {intentOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 relative animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Intent to Trade</h2>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIntentOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <PreTradeExecutionGateV2
                onAllowed={(riskLimit) => {
                  setIntentOpen(false);
                  console.log("Vault allowed. Effective risk:", riskLimit);
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Vault authority is final. If blocked, fix the reason and try again.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
