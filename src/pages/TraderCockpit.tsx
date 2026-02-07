import React, { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TradeIntentModal } from "@/components/vault/TradeIntentModal";
import { CloseTradeModal } from "@/components/vault/CloseTradeModal";
import { VaultAuthorityHeader } from "@/components/vault/VaultAuthorityHeader";
import { FlowSection } from "@/components/vault/FlowSection";
import { TodaysLimitsSection } from "@/components/vault/TodaysLimitsSection";
import { EndOfDayReview } from "@/components/vault/EndOfDayReview";
import { useVaultState } from "@/contexts/VaultStateContext";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/AuthGate";

export default function TraderCockpit() {
  const { state: vaultState, loading: vaultLoading } = useVaultState();
  const [intentOpen, setIntentOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  // "BUYING NOW" — controlled ONLY by Vault State
  const showBuyingNow =
    !vaultLoading &&
    vaultState.vault_status !== "RED" &&
    !vaultState.open_trade &&
    vaultState.trades_remaining_today > 0 &&
    vaultState.risk_remaining_today > 0;

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    limits: false,
    review: false,
  });

  const limitsRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <AuthGate>
      <AppLayout>
        <div className="max-w-xl mx-auto p-4 md:p-6 pb-24 space-y-4">
          {/* Vault Status + Metrics + Risk Mode */}
          <VaultAuthorityHeader />

          {/* Primary Action — BUYING NOW */}
          {showBuyingNow && (
            <Button
              className="vault-cta w-full h-14 text-base font-bold uppercase tracking-wider rounded-xl"
              size="lg"
              onClick={() => setIntentOpen(true)}
            >
              Buying Now
            </Button>
          )}

          {/* Close Trade CTA */}
          {!vaultLoading && vaultState.open_trade && (
            <Button
              variant="outline"
              className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              size="lg"
              onClick={() => setCloseOpen(true)}
            >
              Sell / Close Position
            </Button>
          )}

          {/* Today's Limits */}
          <FlowSection
            title="Today's Limits"
            isOpen={openSections.limits}
            onToggle={() => toggleSection("limits")}
            status="active"
            sectionRef={limitsRef}
            showContinue={false}
          >
            <TodaysLimitsSection />
          </FlowSection>

          {/* End of Day Review */}
          <FlowSection
            title="End of Day Review"
            isOpen={openSections.review}
            onToggle={() => toggleSection("review")}
            status="completed"
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
