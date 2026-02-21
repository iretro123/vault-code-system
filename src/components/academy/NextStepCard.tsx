import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  hasJournaledThisWeek: boolean;
}

export function NextStepCard({ hasJournaledThisWeek }: Props) {
  const navigate = useNavigate();
  const { onboarding } = useAcademyData();
  const { profile } = useAuth();

  let label = "Continue Learning";
  let route = "/academy/learn";
  let hint = "Stay consistent. One lesson per week builds mastery.";

  if (onboarding && !onboarding.claimed_role) {
    label = "Continue Setup";
    route = "/academy/start";
    hint = "Complete your profile to unlock the full academy.";
  } else if (onboarding && !onboarding.first_lesson_completed) {
    label = "Watch Lesson 1";
    route = "/academy/learn";
    hint = "Start with the fundamentals. 15 minutes changes everything.";
  } else if (!hasJournaledThisWeek) {
    label = "Post Your First Trade";
    route = "/academy/trade";
    hint = "Serious traders log at least 1 trade per week for feedback.";
  } else if (!(profile as any)?.profile_completed) {
    label = "Complete Your Profile";
    route = "/academy/settings";
    hint = "A complete profile helps your coach give better feedback.";
  }

  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">
        Your Next Step
      </h3>

      <Button
        onClick={() => navigate(route)}
        className="rounded-xl font-semibold gap-2 h-12 px-7 text-sm"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.50)]">
        {hint}
      </p>
    </div>
  );
}
