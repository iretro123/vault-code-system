import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLoginReminder } from "@/hooks/useLoginReminder";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { TraderHUD } from "@/components/academy/TraderHUD";
import { NextStepCard } from "@/components/academy/NextStepCard";
import { VaultIntelligenceCard } from "@/components/academy/VaultIntelligenceCard";
import { ThisWeekCard } from "@/components/academy/ThisWeekCard";
import { WeeklySnapshotCard } from "@/components/academy/WeeklySnapshotCard";
import { QuickAccessBar } from "@/components/academy/QuickAccessBar";

const AcademyHome = () => {
  const { user, profile, loading } = useAuth();
  const { onboarding } = useAcademyData();
  useLoginReminder();

  if (loading) return null;

  const isFirstVisit =
    profile &&
    (profile as any).academy_experience === "newbie" &&
    !profile.onboarding_completed;

  if (isFirstVisit) {
    return <Navigate to="/academy/start" replace />;
  }

  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Trader";

  return (
    <AcademyLayout>
      {/* HEADER */}
      <header className="px-4 pt-6 pb-2 md:px-6 md:pt-8">
        <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight leading-tight text-foreground">
          Welcome back, {displayName}
        </h1>
      </header>

      <div className="px-4 md:px-6 pb-10 space-y-5 max-w-5xl">
        {/* A) Status Pills */}
        <TraderHUD />

        {/* B) Next Move — ONE primary CTA */}
        <NextStepCard />

        {/* C) Coach Feed — max 2 items */}
        <VaultIntelligenceCard />

        {/* D) This Week Progress */}
        <ThisWeekCard />

        {/* E) Weekly Performance Snapshot */}
        <WeeklySnapshotCard />

        {/* F) Quick Access */}
        <QuickAccessBar />
      </div>
    </AcademyLayout>
  );
};

export default AcademyHome;
