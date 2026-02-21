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
    route = "/academy/start";
  } else if (onboarding && !onboarding.first_lesson_completed) {
    label = "Watch Lesson 1";
    route = "/academy/learn";
  } else if (!(profile as any)?.profile_completed) {
    label = "Complete Your Profile";
    route = "/academy/settings";
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{
        background: "rgba(247,249,252,0.94)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <h3 className="text-base font-bold" style={{ color: "hsl(220,25%,10%)" }}>
        Your Next Move
      </h3>

      <Button
        onClick={() => navigate(route)}
        className="rounded-xl font-semibold gap-2 h-11 px-6"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-xs" style={{ color: "hsl(220,14%,45%)" }}>
        Serious traders log at least 1 trade per week for feedback.
      </p>
    </div>
  );
}
