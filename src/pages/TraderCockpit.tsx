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
import { V1Onboarding } from "@/components/vault/V1Onboarding";
import { TradingSessionToggle } from "@/components/vault/TradingSessionToggle";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { useVaultState } from "@/contexts/VaultStateContext";
import { supabase } from "@/integrations/supabase/client";

function CockpitContent() {
  const { user, profile } = useAuth();
  const { state: vaultState, refetch, loading: vaultLoading } = useVaultState();
  const [intentOpen, setIntentOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    limits: false,
    review: false,
  });

  const limitsRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Show onboarding if profile exists but onboarding not completed
  const needsOnboarding = profile && !profile.onboarding_completed && !onboardingDone;

  const handleOnboardingComplete = useCallback(async () => {
    setIsBooting(true);
    // Persist session_paused = true for new users
    if (user) {
      await supabase
        .from("vault_state")
        .update({ session_paused: true })
        .eq("user_id", user.id);
    }
    await new Promise<void>((resolve) => {
      refetch();
      setTimeout(resolve, 500);
    });
    setHasInitialized(true);
    setOnboardingDone(true);
    setIsBooting(false);
  }, [refetch, user]);

  if (needsOnboarding) {
    return (
      <AppLayout>
        <V1Onboarding onComplete={handleOnboardingComplete} />
      </AppLayout>
    );
  }

  // Block dashboard render while booting
  if (isBooting || (onboardingDone && !hasInitialized)) {
    return null;
  }

  return (
    <AppLayout sessionPaused={vaultState.session_paused}>
      <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 flex gap-6">
        {/* Main execution area — centered */}
        <div className="flex-1 max-w-xl mx-auto space-y-4">
          {hasInitialized && (
            <div className="px-4 py-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-xs text-primary font-medium">
                Vault Initialized. Your protection rules are now set. Today starts in Conservative mode.
              </p>
            </div>
          )}

          <TradingSessionToggle
            paused={vaultState.session_paused}
            onToggle={async () => {
              if (!user) return;
              const newPaused = !vaultState.session_paused;
              const updates: Record<string, any> = { session_paused: newPaused };
              // Stamp activity time when activating session
              if (!newPaused) {
                updates.last_activity_at = new Date().toISOString();
              }
              await supabase
                .from("vault_state")
                .update(updates)
                .eq("user_id", user.id);
              refetch();
            }}
          />

          <VaultHUD
            onBuyingNow={() => setIntentOpen(true)}
            onCloseTrade={() => setCloseOpen(true)}
            sessionPaused={vaultState.session_paused}
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
            <p className="text-xs text-muted-foreground text-center pt-3">
              Vault resets tomorrow with fresh limits.
            </p>
          </FlowSection>
        </div>

        {/* Right-side docked panel (desktop only) */}
        <CockpitSidePanel />
      </div>

      <TradeIntentModal open={intentOpen} onClose={() => setIntentOpen(false)} />
      <CloseTradeModal open={closeOpen} onClose={() => setCloseOpen(false)} />
    </AppLayout>
  );
}

export default function TraderCockpit() {
  return (
    <AuthGate>
      <CockpitContent />
    </AuthGate>
  );
}
