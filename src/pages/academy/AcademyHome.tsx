import { useState, useEffect, useCallback } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLoginReminder } from "@/hooks/useLoginReminder";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { supabase } from "@/integrations/supabase/client";
import { TraderHUD } from "@/components/academy/TraderHUD";
import { NextMoveCard } from "@/components/academy/NextMoveCard";
import { DailyCheckInCard } from "@/components/academy/DailyCheckInCard";
import { PathMilestonesCard } from "@/components/academy/PathMilestonesCard";
import { AccountabilityNudge } from "@/components/academy/AccountabilityNudge";
import { WeeklyPerformanceCard } from "@/components/academy/WeeklyPerformanceCard";

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

      <div className="px-4 md:px-6 pb-8 space-y-6 max-w-3xl">
        {/* ZONE 1: Status Strip */}
        <TraderHUD />

        {/* ZONE 2: Your Next Move */}
        <NextMoveCard />

        {/* ZONE 3: Daily Check-In */}
        <DailyCheckInCard />

        {/* ZONE 4: Your Path */}
        <PathMilestonesCard />

        {/* ZONE 5: Accountability Nudge */}
        <AccountabilityNudge hasJournaledThisWeek={hasJournaled} />

        {/* Weekly Performance Report */}
        <WeeklyPerformanceCard />
      </div>
    </AcademyLayout>
  );
};

export default AcademyHome;
