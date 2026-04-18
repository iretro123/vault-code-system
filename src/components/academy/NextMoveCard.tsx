import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { useAuth } from "@/hooks/useAuth";

export function NextMoveCard() {
  const navigate = useNavigate();
  const { onboarding } = useAcademyData();
  const { profile } = useAuth();

  // Determine primary action
  let label = "Continue Learning";
  let route = "/academy/learn";

  if (onboarding && !onboarding.claimed_role) {
    label = "Continue Setup";
    route = "/academy/home";
  } else if (onboarding && !onboarding.first_lesson_completed) {
    label = "Watch Lesson 1";
    route = "/academy/learn";
  } else if (!profile?.profile_completed) {
    label = "Complete Your Profile";
    route = "/academy/settings";
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-4 border border-white/[0.10]"
      style={{
        background: "rgba(255,255,255,0.07)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <h3 className="text-base font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
        Your Next Move
      </h3>

      <Button
        onClick={() => navigate(route)}
        className="rounded-xl font-semibold gap-2 h-11 px-6"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
        Serious traders log at least 1 trade per week for feedback.
      </p>
    </div>
  );
}
