import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLoginReminder } from "@/hooks/useLoginReminder";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { HeroHeader } from "@/components/academy/dashboard/HeroHeader";
import { GameplanCard } from "@/components/academy/dashboard/GameplanCard";
import { ScoreboardCard } from "@/components/academy/dashboard/ScoreboardCard";
import { CoachCard } from "@/components/academy/dashboard/CoachCard";
import { LiveCallsCard } from "@/components/academy/dashboard/LiveCallsCard";
import { ToolkitCard } from "@/components/academy/dashboard/ToolkitCard";
import { QuickAccessRow } from "@/components/academy/dashboard/QuickAccessRow";
import { DailyCheckInModal } from "@/components/academy/DailyCheckInModal";

const AcademyHome = () => {
  const { user, profile, loading } = useAuth();
  const { onboarding } = useAcademyData();
  const location = useLocation();
  useLoginReminder();

  const [checkInOpen, setCheckInOpen] = useState(false);

  useEffect(() => {
    if (location.hash === "#checkin") setCheckInOpen(true);
  }, [location.hash]);

  useEffect(() => {
    const handler = () => setCheckInOpen(true);
    window.addEventListener("open-checkin", handler);
    return () => window.removeEventListener("open-checkin", handler);
  }, []);

  if (loading) return null;

  const isFirstVisit =
    profile &&
    (profile as any).academy_experience === "newbie" &&
    !profile.onboarding_completed;

  if (isFirstVisit) {
    return <Navigate to="/academy/start" replace />;
  }

  const firstName = profile?.display_name?.split(" ")[0] || profile?.email?.split("@")[0] || "Trader";

  return (
    <AcademyLayout>
      <div className="px-4 md:px-6 pt-6 md:pt-8 pb-10 space-y-6 max-w-6xl">
        {/* 1) Hero Header */}
        <HeroHeader firstName={firstName} onCheckIn={() => setCheckInOpen(true)} />

        {/* 2 + 3) Gameplan + Scoreboard */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <GameplanCard onCheckIn={() => setCheckInOpen(true)} />
          </div>
          <div className="lg:col-span-2">
            <ScoreboardCard />
          </div>
        </div>

        {/* 4) Coach Card */}
        <CoachCard />

        {/* 5 + 6) Live Calls + Toolkit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <LiveCallsCard />
          <ToolkitCard />
        </div>

        {/* 7) Quick Access */}
        <QuickAccessRow />
      </div>

      <DailyCheckInModal open={checkInOpen} onOpenChange={setCheckInOpen} />
    </AcademyLayout>
  );
};

export default AcademyHome;
