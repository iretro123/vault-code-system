import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getNextStep, type NextStep } from "@/lib/getNextStep";

export function NextStepCard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<NextStep | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;

    getNextStep({
      userId: user.id,
      onboardingComplete: !!profile.onboarding_completed,
      profileComplete: !!(profile as any).profile_completed,
    }).then((s) => {
      if (!cancelled) {
        setStep(s);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user, profile]);

  if (loading || !step) {
    return (
      <div className="vault-glass-card p-6 flex items-center justify-center h-[140px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">
        {step.title}
      </h3>

      <Button
        onClick={() => navigate(step.cta_route)}
        className="rounded-xl font-semibold gap-2 h-12 px-7 text-sm"
      >
        {step.cta_label}
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.50)]">
        {step.description}
      </p>
    </div>
  );
}
