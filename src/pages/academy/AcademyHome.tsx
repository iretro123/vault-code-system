import { useState, useEffect, useRef } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLoginReminder } from "@/hooks/useLoginReminder";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { HeroHeader } from "@/components/academy/dashboard/HeroHeader";
import { GameplanCard } from "@/components/academy/dashboard/GameplanCard";
import { NextGroupCallCard } from "@/components/academy/dashboard/NextGroupCallCard";
import { CommunityCard } from "@/components/academy/dashboard/CommunityCard";
import { StartLearningCard } from "@/components/academy/dashboard/StartLearningCard";
import { AskCoachCard } from "@/components/academy/dashboard/AskCoachCard";
import { DailyCheckInModal } from "@/components/academy/DailyCheckInModal";
import { ClaimRoleModal } from "@/components/academy/ClaimRoleModal";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useRoleEvolution } from "@/hooks/useRoleEvolution";

const AcademyHome = () => {
  const { user, profile, loading } = useAuth();
  const { onboarding } = useAcademyData();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasAccess, refetch: refetchAccess } = useStudentAccess();
  const { logActivity } = useActivityLog();
  useLoginReminder();
  useRoleEvolution();

  // Log dashboard view on mount
  useEffect(() => {
    logActivity("academy_home_view", "dashboard");
  }, []);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [claimRoleOpen, setClaimRoleOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handledRef = useRef(false);

  // Checkout return handling
  useEffect(() => {
    if (handledRef.current) return;
    const checkout = searchParams.get("checkout");
    if (!checkout) return;
    handledRef.current = true;

    // Clear params
    const newUrl = location.pathname;
    navigate(newUrl, { replace: true });

    if (checkout === "success") {
      console.log("[AccessGate] Checkout success return — starting poll");
      toast.info("Payment received. Finalizing access…", { duration: 8000 });
      logActivity("checkout_return_success", "dashboard");

      let elapsed = 0;
      pollRef.current = setInterval(async () => {
        elapsed += 3000;
        console.log("[AccessGate] Polling access…", elapsed / 1000, "s");
        await refetchAccess();
        // We check hasAccess in the next render, but also re-read cache
        try {
          const cached = JSON.parse(localStorage.getItem("va_cache_student_access") || "{}");
          if (cached.hasAccess) {
            console.log("[AccessGate] Access confirmed via poll");
            toast.success("Access granted! Welcome to Vault Academy.");
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch {}
        if (elapsed >= 30000 && pollRef.current) {
          console.log("[AccessGate] Poll timeout — stopping");
          clearInterval(pollRef.current);
          pollRef.current = null;
          toast.info("Access is granted by secure billing confirmation (usually a few seconds). If access doesn't update, click Refresh Access.", { duration: 10000 });
        }
      }, 3000);
    } else if (checkout === "canceled") {
      toast.info("Checkout canceled. You can try again anytime.");
      logActivity("checkout_return_canceled", "dashboard");
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [searchParams]);

  useEffect(() => {
    if (location.hash === "#checkin") setCheckInOpen(true);
  }, [location.hash]);

  useEffect(() => {
    const handler = () => setCheckInOpen(true);
    window.addEventListener("open-checkin", handler);
    return () => window.removeEventListener("open-checkin", handler);
  }, []);

  if (loading) {
    return (
      <>
        <div className="px-4 md:px-6 pt-6 md:pt-8 pb-10 space-y-6 max-w-6xl animate-pulse">
          <div className="h-24 rounded-2xl bg-muted/40" />
          <div className="h-40 rounded-2xl bg-muted/30" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 h-48 rounded-2xl bg-muted/30" />
            <div className="lg:col-span-2 h-48 rounded-2xl bg-muted/30" />
          </div>
        </div>
      </>
    );
  }


  const firstName = profile?.display_name?.split(" ")[0] || profile?.email?.split("@")[0] || "Trader";

  return (
    <>
      <div className="px-4 md:px-6 pt-6 md:pt-8 pb-10 space-y-6 max-w-6xl animate-fade-in">
        <HeroHeader firstName={firstName} onCheckIn={() => setCheckInOpen(true)} />

        <GameplanCard onCheckIn={() => setCheckInOpen(true)} onClaimRole={() => setClaimRoleOpen(true)} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="flex flex-col gap-5">
            <NextGroupCallCard />
            <CommunityCard />
          </div>
          <StartLearningCard />
        </div>

        <AskCoachCard />
      </div>

      <DailyCheckInModal open={checkInOpen} onOpenChange={setCheckInOpen} />
      <ClaimRoleModal open={claimRoleOpen} onOpenChange={setClaimRoleOpen} />
    </>
  );
};

export default AcademyHome;
