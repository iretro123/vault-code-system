import React, { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TradeIntentModal } from "@/components/vault/TradeIntentModal";
import { CloseTradeModal } from "@/components/vault/CloseTradeModal";
import { VaultAuthorityHeader } from "@/components/vault/VaultAuthorityHeader";
import { VaultHUD } from "@/components/vault/VaultHUD";
import { FlowSection } from "@/components/vault/FlowSection";
import { TodaysLimitsSection } from "@/components/vault/TodaysLimitsSection";
import { EndOfDayReview } from "@/components/vault/EndOfDayReview";
import { CockpitSidePanel } from "@/components/vault/CockpitSidePanel";
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
        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 flex gap-6">
          {/* Main execution area — centered */}
          <div className="flex-1 max-w-xl mx-auto space-y-4">
            <VaultAuthorityHeader />

            <VaultHUD
              onBuyingNow={() => setIntentOpen(true)}
              onCloseTrade={() => setCloseOpen(true)}
            />

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

          {/* Right-side docked panel (desktop only) */}
          <CockpitSidePanel />
        </div>

        <TradeIntentModal open={intentOpen} onClose={() => setIntentOpen(false)} />
        <CloseTradeModal open={closeOpen} onClose={() => setCloseOpen(false)} />
      </AppLayout>
    </AuthGate>
  );
}
