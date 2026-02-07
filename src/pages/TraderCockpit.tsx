import React, { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TradeIntentModal } from "@/components/vault/TradeIntentModal";
import { CloseTradeModal } from "@/components/vault/CloseTradeModal";
import { VaultAuthorityHeader } from "@/components/vault/VaultAuthorityHeader";
import { VaultHUD } from "@/components/vault/VaultHUD";
import { FlowSection } from "@/components/vault/FlowSection";
import { TodaysLimitsSection } from "@/components/vault/TodaysLimitsSection";
import { EndOfDayReview } from "@/components/vault/EndOfDayReview";
import { ScalingRulesPanel } from "@/components/vault/ScalingRulesPanel";
import { AuthGate } from "@/components/AuthGate";

export default function TraderCockpit() {
  const [intentOpen, setIntentOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

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

          {/* VaultHUD — always renders, buttons disabled by rules */}
          <VaultHUD
            onBuyingNow={() => setIntentOpen(true)}
            onCloseTrade={() => setCloseOpen(true)}
          />

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

          {/* Scaling Rules */}
          <ScalingRulesPanel />
        </div>

        <TradeIntentModal open={intentOpen} onClose={() => setIntentOpen(false)} />
        <CloseTradeModal open={closeOpen} onClose={() => setCloseOpen(false)} />
      </AppLayout>
    </AuthGate>
  );
}
