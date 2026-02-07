import React, { useState, useRef, useCallback } from "react";
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

  // Section open states — informational only, no gating
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    ritual: true,
    limits: false,
    focus: false,
    log: false,
    review: false,
  });

  const ritualRef = useRef<HTMLDivElement>(null);
  const limitsRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
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

  return (
    <AuthGate>
      <AppLayout>
        <div className="max-w-xl mx-auto p-4 md:p-6 pb-24 space-y-4">
          <VaultAuthorityHeader />

          {/* Primary Action — ONLY controlled by Vault State */}
          {showBuyingNow && (
            <Button
              className="vault-cta w-full h-14 text-base font-bold uppercase tracking-wider rounded-xl"
              size="lg"
              onClick={() => setIntentOpen(true)}
            >
              Buying Now
            </Button>
          )}

          {/* Close Trade CTA — controlled ONLY by open_trade */}
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

          {/* Section 1: Daily Ritual — visible, informational only */}
          <FlowSection
            title="Daily Ritual"
            isOpen={openSections.ritual}
            onToggle={() => toggleSection("ritual")}
            status="completed"
            sectionRef={ritualRef}
            onContinue={() => scrollToAndExpand("limits", limitsRef)}
            showContinue={true}
          >
            <DailyVaultGate />
          </FlowSection>

          {/* Section 2: Today's Limits — visible, informational only */}
          <FlowSection
            title="Today's Limits"
            isOpen={openSections.limits}
            onToggle={() => toggleSection("limits")}
            status="completed"
            sectionRef={limitsRef}
            onContinue={() => scrollToAndExpand("focus", focusRef)}
            showContinue={true}
          >
            <TodaysLimitsSection />
          </FlowSection>

          {/* Section 3: Focus Session — visible, informational only */}
          <FlowSection
            title="Focus Session"
            isOpen={openSections.focus}
            onToggle={() => toggleSection("focus")}
            status="completed"
            sectionRef={focusRef}
            onContinue={() => scrollToAndExpand("log", logRef)}
            showContinue={true}
          >
            <FocusSessionCard variant="embedded" />
          </FlowSection>

          {/* Section 4: Trade Logger — visible, informational only */}
          <FlowSection
            title="Trade Log"
            isOpen={openSections.log}
            onToggle={() => toggleSection("log")}
            status="completed"
            sectionRef={logRef}
            onContinue={() => scrollToAndExpand("review", reviewRef)}
            showContinue={true}
          >
            <TradeLoggerCard variant="embedded" />
          </FlowSection>

          {/* Section 5: End of Day Review */}
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
