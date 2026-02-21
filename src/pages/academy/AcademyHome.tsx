import { useState, useEffect, useCallback } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLoginReminder } from "@/hooks/useLoginReminder";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { supabase } from "@/integrations/supabase/client";
import { TraderHUD } from "@/components/academy/TraderHUD";
import { NextStepCard } from "@/components/academy/NextStepCard";
import { TodayChecklistCard } from "@/components/academy/TodayChecklistCard";
import { CoachFeedCard } from "@/components/academy/CoachFeedCard";
import { ThisWeekCard } from "@/components/academy/ThisWeekCard";
import { WeeklySnapshotCard } from "@/components/academy/WeeklySnapshotCard";
import { QuickAccessBar } from "@/components/academy/QuickAccessBar";

const AcademyHome = () => {
  const { user, profile, loading } = useAuth();
  const { onboarding } = useAcademyData();
  useLoginReminder();

  const [hasJournaled, setHasJournaled] = useState(true);

  const checkJournal = useCallback(async () => {
    if (!user) return;
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + (monday.getDay() === 0 ? -6 : 1));
    const { data } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("user_id", user.id)
      .gte("entry_date", monday.toISOString().slice(0, 10))
      .limit(1);
    setHasJournaled((data?.length ?? 0) > 0);
  }, [user]);

  useEffect(() => {
    checkJournal();
  }, [checkJournal]);

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
      <PageHeader
        title={`Welcome back, ${displayName}`}
        subtitle="Your trading discipline journey continues"
      />

      <div className="px-4 md:px-6 pb-10 space-y-6 max-w-5xl">
        {/* ROW 1: Quick Stats */}
        <TraderHUD />

        {/* MAIN GRID: 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT COLUMN */}
          <div className="space-y-5">
            <NextStepCard hasJournaledThisWeek={hasJournaled} />
            <TodayChecklistCard hasJournaledThisWeek={hasJournaled} />
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">
            <CoachFeedCard />
            <ThisWeekCard />
          </div>
        </div>

        {/* BOTTOM: Weekly Snapshot */}
        <WeeklySnapshotCard />

        {/* BOTTOM: Quick Access */}
        <QuickAccessBar />
      </div>
    </AcademyLayout>
  );
};

export default AcademyHome;
