import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { OnboardingProgressBar, OnboardingStep } from "./OnboardingStep";
import { VaultTourCarousel } from "./VaultTourCarousel";
import {
  Loader2,
  ChevronRight,
  Check,
  Target,
  ShieldCheck,
  Crosshair,
  Users,
  Bell,
  Sparkles,
} from "lucide-react";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type TradingGoal =
  | "build_consistency"
  | "manage_risk"
  | "find_edge"
  | "stay_accountable";

const EXPERIENCE_OPTIONS: {
  value: ExperienceLevel;
  label: string;
  desc: string;
}[] = [
  {
    value: "beginner",
    label: "Beginner",
    desc: "New to trading or under 6 months of experience.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    desc: "1–3 years. You have a strategy but need consistency.",
  },
  {
    value: "advanced",
    label: "Advanced",
    desc: "3+ years. You're refining your edge and scaling.",
  },
];

const GOAL_OPTIONS: { value: TradingGoal; label: string; icon: typeof Target }[] = [
  { value: "build_consistency", label: "Build consistency", icon: Target },
  { value: "manage_risk", label: "Manage risk better", icon: ShieldCheck },
  { value: "find_edge", label: "Find my edge", icon: Crosshair },
  { value: "stay_accountable", label: "Stay accountable", icon: Users },
];

export function AppOnboarding({ isPreview = false }: { isPreview?: boolean }) {
  const navigate = useNavigate();
  const { user, profile, refetchProfile } = useAuth();
  const [step, setStep] = useState(0);

  // Step 1 — Identity
  const [firstName, setFirstName] = useState((profile as any)?.first_name || "");
  const [lastName, setLastName] = useState((profile as any)?.last_name || "");
  const detectedTz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/New_York";
    }
  })();

  // Step 2 — Experience
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);

  // Step 4 — Goal
  const [goal, setGoal] = useState<TradingGoal | null>(null);

  // Final
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);

  const next = () => setStep((s) => s + 1);

  const handleDismiss = useCallback(async () => {
    if (isPreview) {
      // In preview mode, just navigate away without touching DB
      const url = new URL(window.location.href);
      url.searchParams.delete("preview-onboarding");
      window.history.replaceState({}, "", url.toString());
      window.location.reload();
      return;
    }
    await refetchProfile();
  }, [isPreview, refetchProfile]);

  const handleActivate = useCallback(async () => {
    if (!user) return;
    if (isPreview) {
      setActivated(true);
      return;
    }
    setSubmitting(true);
    try {
      const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Trader";
      const roleLevel = experience || "beginner";

      await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          timezone: detectedTz,
          role_level: roleLevel,
          academy_experience: roleLevel,
          trading_goal: goal || null,
          profile_completed: true,
        } as any)
        .eq("user_id", user.id);

      await supabase
        .from("onboarding_state")
        .upsert(
          { user_id: user.id, claimed_role: true, role_level: roleLevel },
          { onConflict: "user_id" }
        );

      setActivated(true);

      // Auto-advance after 1.5s
      setTimeout(async () => {
        await refetchProfile();
      }, 1500);
    } catch (e) {
      console.error("Onboarding activation failed:", e);
    } finally {
      setSubmitting(false);
    }
  }, [user, firstName, lastName, experience, goal, detectedTz, refetchProfile, isPreview]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background overflow-y-auto">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background: [
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
            "radial-gradient(ellipse 50% 50% at 15% 10%, rgba(56,189,248,0.10) 0%, transparent 70%)",
            "radial-gradient(ellipse 45% 55% at 85% 45%, rgba(59,130,246,0.08) 0%, transparent 70%)",
            "linear-gradient(170deg, hsl(220,25%,5%) 0%, hsl(216,30%,6%) 40%, hsl(222,35%,4%) 100%)",
          ].join(", "),
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-10 min-h-[100dvh]">
        {step > 0 && step < 6 && <OnboardingProgressBar current={step} />}

        {/* Step 0 — Welcome */}
        <OnboardingStep active={step === 0}>
          <div className="flex flex-col items-center gap-8 py-12">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.15)]">
              <Sparkles className="h-12 w-12 text-primary" strokeWidth={1.5} />
            </div>
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome to Vault Academy
              </h1>
              <p className="text-base text-muted-foreground max-w-xs leading-relaxed">
                Your premium trading operating system. Let's set up your vault in
                under 2 minutes.
              </p>
            </div>
            <Button
              onClick={next}
              className="w-full h-14 text-base font-semibold tracking-wide rounded-2xl mt-4"
            >
              Let's Set Up Your Vault
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        </OnboardingStep>

        {/* Step 1 — Identity */}
        <OnboardingStep active={step === 1}>
          <div className="flex flex-col gap-6 w-full py-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Your Identity
              </h2>
              <p className="text-sm text-muted-foreground">
                How should we address you?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  First Name
                </label>
                <Input
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] text-base"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Last Name
                </label>
                <Input
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] text-base"
                />
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Timezone</span>
                <span className="text-sm text-foreground font-medium ml-auto">
                  {detectedTz.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <Button
              onClick={next}
              disabled={!firstName.trim()}
              className="w-full h-14 text-base font-semibold tracking-wide rounded-2xl mt-2"
            >
              Continue
            </Button>
          </div>
        </OnboardingStep>

        {/* Step 2 — Experience */}
        <OnboardingStep active={step === 2}>
          <div className="flex flex-col gap-6 w-full py-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Your Experience
              </h2>
              <p className="text-sm text-muted-foreground">
                Where are you on your trading journey?
              </p>
            </div>

            <div className="space-y-3">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExperience(opt.value)}
                  className={cn(
                    "w-full text-left rounded-2xl border p-5 transition-all duration-200",
                    experience === opt.value
                      ? "border-primary/40 bg-primary/[0.08] shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <p className="text-base font-semibold text-foreground">
                    {opt.label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            <Button
              onClick={next}
              disabled={!experience}
              className="w-full h-14 text-base font-semibold tracking-wide rounded-2xl mt-2"
            >
              Continue
            </Button>
          </div>
        </OnboardingStep>

        {/* Step 3 — Vault Tour */}
        <OnboardingStep active={step === 3}>
          <div className="w-full py-4">
            <VaultTourCarousel onComplete={next} />
          </div>
        </OnboardingStep>

        {/* Step 4 — Trading Goal */}
        <OnboardingStep active={step === 4}>
          <div className="flex flex-col gap-6 w-full py-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Your #1 Goal
              </h2>
              <p className="text-sm text-muted-foreground">
                What matters most to you right now?
              </p>
            </div>

            <div className="space-y-3">
              {GOAL_OPTIONS.map((opt) => {
                const GoalIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setGoal(opt.value)}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-2xl border p-5 transition-all duration-200",
                      goal === opt.value
                        ? "border-primary/40 bg-primary/[0.08] shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="h-11 w-11 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                      <GoalIcon className="h-5 w-5 text-foreground" />
                    </div>
                    <span className="text-base font-semibold text-foreground">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={next}
              disabled={!goal}
              className="w-full h-14 text-base font-semibold tracking-wide rounded-2xl mt-2"
            >
              Continue
            </Button>
          </div>
        </OnboardingStep>

        {/* Step 5 — Notifications */}
        <OnboardingStep active={step === 5}>
          <div className="flex flex-col items-center gap-8 py-12">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/10 flex items-center justify-center">
              <Bell className="h-10 w-10 text-foreground" strokeWidth={1.5} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Stay in the Loop
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Get notified about live calls, coach answers, and important
                updates. You can change this anytime.
              </p>
            </div>
            <div className="w-full space-y-3 mt-2">
              <Button
                onClick={() => {
                  if ("Notification" in window) {
                    Notification.requestPermission();
                  }
                  next();
                }}
                className="w-full h-14 text-base font-semibold tracking-wide rounded-2xl"
              >
                Enable Notifications
              </Button>
              <button
                onClick={next}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Skip for now
              </button>
            </div>
          </div>
        </OnboardingStep>

        {/* Step 6 — Activation */}
        <OnboardingStep active={step === 6}>
          <div className="flex flex-col items-center gap-8 py-12 relative">
            {activated ? (
              <>
                <div className="h-24 w-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shadow-[0_0_60px_hsl(var(--primary)/0.25)] animate-scale-in">
                  <Check className="h-12 w-12 text-primary" strokeWidth={2.5} />
                </div>
                <div className="text-center space-y-3 animate-fade-in">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    Your Vault is Ready
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Welcome aboard, {firstName || "Trader"}. Let's build something great.
                  </p>
                </div>
                <Button
                  onClick={handleDismiss}
                  className="w-full h-14 text-base font-semibold tracking-wide rounded-2xl mt-2"
                >
                  Go to Dashboard
                  <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Ready to Activate
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    We'll set up your vault with these preferences. You can change
                    everything later in Settings.
                  </p>
                </div>

                {/* Summary */}
                <div className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                  <SummaryRow label="Name" value={[firstName, lastName].filter(Boolean).join(" ") || "—"} />
                  <SummaryRow label="Experience" value={experience ? experience.charAt(0).toUpperCase() + experience.slice(1) : "—"} />
                  <SummaryRow label="Goal" value={GOAL_OPTIONS.find((g) => g.value === goal)?.label || "—"} />
                  <SummaryRow label="Timezone" value={detectedTz.replace(/_/g, " ")} />
                </div>

                <Button
                  onClick={handleActivate}
                  disabled={submitting}
                  className="w-full h-14 text-base font-bold tracking-wider uppercase rounded-2xl bg-gradient-to-r from-primary to-blue-400 hover:brightness-110 transition-all relative overflow-hidden"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Activate My Vault"
                  )}
                  {/* Shimmer overlay */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </Button>
              </>
            )}
          </div>
        </OnboardingStep>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
