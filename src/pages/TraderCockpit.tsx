import React, { useMemo, useState } from "react";
import { VaultHUD } from "@/components/vault/VaultHUD";
import { DailyVaultGate } from "@/components/DailyVaultGate";
import { PreTradeExecutionGateV2 } from "@/components/vault/PreTradeExecutionGateV2";
import { VaultIdentityCard } from "@/components/VaultIdentityCard";
import { VaultLevelCard } from "@/components/VaultLevelCard";
import { SessionIntegrityCard } from "@/components/vault/SessionIntegrityCard";
import { FocusSessionCard } from "@/components/vault/FocusSessionCard";
import { TradeLoggerCard } from "@/components/vault/TradeLoggerCard";
import { WelcomeCard } from "@/components/vault/WelcomeCard";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";

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
    <AuthGate>
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        <WelcomeCard />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Minimal action column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Daily Ritual Card */}
            <Card className="vault-card p-5" data-ritual-gate>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Daily Ritual
                </h2>
                {vaultOpen && (
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
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
            <Card className="vault-card p-5">
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
                className="vault-cta w-full h-14 text-lg font-semibold rounded-xl"
                size="lg"
                onClick={() => setIntentOpen(true)}
              >
                {ctaLabel}
              </Button>

              {/* If blocked, show reason */}
              {!loading && blocked && (
                <div className="mt-4 p-3 rounded-xl border border-white/10 bg-white/5">
                  <p className="text-xs font-medium text-foreground uppercase tracking-wide mb-1">
                    Trading Locked
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">Vault is protecting discipline.</p>
                  <p className="text-sm text-muted-foreground">
                    {data?.block_reason ?? "Not allowed right now."}
                  </p>
                </div>
              )}

              {!loading && cooldown && (
                <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10">
                  <p className="text-sm text-amber-400">
                    Cooldown active — wait {data?.cooldown_remaining_minutes ?? "…"} min.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center mt-4">
                One click. Vault decides. Verified trades only.
              </p>
            </Card>

            {/* Trade Logger */}
            <TradeLoggerCard />
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
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="vault-card w-full max-w-md p-6 relative animate-scale-in">
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
    </AuthGate>
  );
}
