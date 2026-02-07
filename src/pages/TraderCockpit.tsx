import React, { useMemo, useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DailyVaultGate } from "@/components/DailyVaultGate";
import { TradeIntentModal } from "@/components/vault/TradeIntentModal";
import { CloseTradeModal } from "@/components/vault/CloseTradeModal";
import { FocusSessionCard } from "@/components/vault/FocusSessionCard";
import { TradeLoggerCard } from "@/components/vault/TradeLoggerCard";
import { VaultAuthorityHeader } from "@/components/vault/VaultAuthorityHeader";
import { FlowSection } from "@/components/vault/FlowSection";
import { TodaysLimitsSection } from "@/components/vault/TodaysLimitsSection";
import { EndOfDayReview } from "@/components/vault/EndOfDayReview";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { useVaultState } from "@/contexts/VaultStateContext";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/AuthGate";

export default function TraderCockpit() {
  const { data, loading } = useVaultExecutionPermission();
  const { state: vaultState, loading: vaultLoading } = useVaultState();
  const [intentOpen, setIntentOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const blocked = !!data && !data.execution_allowed;
  const cooldown = !!data?.cooldown_active;

  // "BUYING NOW" button visibility from Vault State
  const showBuyingNow =
    !vaultLoading &&
    vaultState.vault_status !== "RED" &&
    !vaultState.open_trade &&
    vaultState.trades_remaining_today > 0 &&
    vaultState.risk_remaining_today > 0;

  // Section open states — all sections are expandable, ritual is just informational
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    ritual: true,
    limits: false,
    focus: false,
    execution: false,
    review: false,
  });

  // Section refs for scrolling
  const ritualRef = useRef<HTMLDivElement>(null);
  const limitsRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const executionRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const scrollToAndExpand = useCallback(
    (key: string, ref: React.RefObject<HTMLDivElement>) => {
      setOpenSections((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    },
    []
  );

  const ctaLabel = useMemo(() => {
    if (loading) return "Checking Vault…";
    if (blocked) return "Not Cleared";
    if (cooldown) return "Cooldown Active";
    return "Intent to Trade";
  }, [loading, blocked, cooldown]);

  const ctaDisabled = useMemo(() => {
    return loading || blocked || cooldown;
  }, [loading, blocked, cooldown]);

  // Active section = currently expanded section
  const getActiveSection = (): string | null => {
    if (openSections.ritual) return "ritual";
    if (openSections.limits) return "limits";
    if (openSections.focus) return "focus";
    if (openSections.execution) return "execution";
    return null;
  };

  const activeSection = getActiveSection();

  // Section status — no locking based on ritual
  const getSectionStatus = (key: string): "active" | "completed" | "locked" => {
    if (key === activeSection) return "active";
    return "completed";
  };

  return (
    <AuthGate>
      <AppLayout>
        <div className="max-w-xl mx-auto p-4 md:p-6 pb-24 space-y-4">
          <VaultAuthorityHeader />

          {/* Primary Action */}
          {showBuyingNow && (
            <Button
              className="vault-cta w-full h-14 text-base font-bold uppercase tracking-wider rounded-xl"
              size="lg"
              onClick={() => setIntentOpen(true)}
            >
              Buying Now
            </Button>
          )}

          {/* Close Trade CTA — shown when a trade is open */}
          {!vaultLoading && vaultState.open_trade && (
            <Button
              variant="outline"
              className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              size="lg"
              onClick={() => setCloseOpen(true)}
            >
              Close Trade
            </Button>
          )}

          {/* Section 1: Daily Ritual (informational only) */}
          <FlowSection
            title="Daily Ritual"
            isOpen={openSections.ritual}
            onToggle={() => toggleSection("ritual")}
            status={getSectionStatus("ritual")}
            sectionRef={ritualRef}
            onContinue={() => scrollToAndExpand("limits", limitsRef)}
            showContinue={true}
          >
            <DailyVaultGate />
          </FlowSection>

          {/* Section 2: Today's Limits */}
          <FlowSection
            title="Today's Limits"
            isOpen={openSections.limits}
            onToggle={() => toggleSection("limits")}
            status={getSectionStatus("limits")}
            sectionRef={limitsRef}
            onContinue={() => scrollToAndExpand("focus", focusRef)}
            showContinue={true}
          >
            <TodaysLimitsSection />
          </FlowSection>

          {/* Section 3: Focus Session */}
          <FlowSection
            title="Focus Session"
            isOpen={openSections.focus}
            onToggle={() => toggleSection("focus")}
            status={getSectionStatus("focus")}
            sectionRef={focusRef}
            onContinue={() => scrollToAndExpand("execution", executionRef)}
            showContinue={true}
          >
            <FocusSessionCard variant="embedded" />
          </FlowSection>

          {/* Section 4: Execution + Trade Logger */}
          <FlowSection
            title="Execution"
            isOpen={openSections.execution}
            onToggle={() => toggleSection("execution")}
            status={getSectionStatus("execution")}
            sectionRef={executionRef}
            showContinue={true}
            onContinue={() => scrollToAndExpand("review", reviewRef)}
          >
            <div className="space-y-4">
              {/* Execution CTA */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">
                    {data?.effective_risk_limit != null && (
                      <>
                        Risk:{" "}
                        <span className="font-mono text-foreground">
                          {data.effective_risk_limit.toFixed(2)}%
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <Button
                  disabled={ctaDisabled}
                  className="vault-cta w-full h-12 text-base font-semibold rounded-xl"
                  size="lg"
                  onClick={() => setIntentOpen(true)}
                >
                  {ctaLabel}
                </Button>

                {/* Cooldown notice */}
                {!loading && cooldown && (
                  <div className="mt-3 p-3 rounded-xl border border-warning/20 bg-warning/10">
                    <p className="text-sm text-warning">
                      Cooldown active — wait {data?.cooldown_remaining_minutes ?? "…"} min.
                    </p>
                  </div>
                )}
              </div>

              {/* Trade Logger */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                  Log Trade
                </p>
                <TradeLoggerCard variant="embedded" />
              </div>
            </div>
          </FlowSection>

          {/* Section 5: End of Day Review */}
          <FlowSection
            title="End of Day Review"
            isOpen={openSections.review}
            onToggle={() => toggleSection("review")}
            status={getSectionStatus("review")}
            sectionRef={reviewRef}
            showContinue={false}
          >
            <EndOfDayReview />
          </FlowSection>
        </div>

        <TradeIntentModal open={intentOpen} onClose={() => setIntentOpen(false)} />
        <CloseTradeModal open={closeOpen} onClose={() => setCloseOpen(false)} />
      </AppLayout>
    </AuthGate>
  );
}
