import { useEffect, useCallback } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLoginReminder } from "@/hooks/useLoginReminder";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { DashboardStatusLine } from "@/components/academy/DashboardStatusLine";
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
      <header className="px-4 pt-6 pb-4 md:px-6 md:pt-8">
        <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight leading-tight text-foreground">
          Welcome back, {displayName}
        </h1>
        <DashboardStatusLine />
      </header>

      <div className="px-4 md:px-6 pb-10 space-y-6 max-w-5xl">
        {/* PRIMARY CTA */}
        <NextStepCard />

        {/* VAULT INTELLIGENCE */}
        <VaultIntelligenceCard />

        {/* THIS WEEK */}
        <ThisWeekCard />

        {/* WEEKLY PERFORMANCE SNAPSHOT (collapsed) */}
        <WeeklySnapshotCard />

        {/* QUICK ACCESS */}
        <QuickAccessBar />
      </div>
    </AcademyLayout>
  );
};

export default AcademyHome;
