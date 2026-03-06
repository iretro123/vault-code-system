import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Check, Rocket, BookOpen, MessageSquare, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcademyData } from "@/contexts/AcademyDataContext";

interface OnboardingStep {
  label: string;
  key: "claimed_role" | "first_lesson_completed" | "intro_posted";
  route: string;
  icon: typeof Rocket;
}

const STEPS: OnboardingStep[] = [
  { label: "Claim Role", key: "claimed_role", route: "/academy/home", icon: Rocket },
  { label: "Watch First Lesson", key: "first_lesson_completed", route: "/academy/learn", icon: BookOpen },
  { label: "Introduce Yourself", key: "intro_posted", route: "/academy/room/options-lounge", icon: MessageSquare },
];

export function OnboardingProgressCard() {
  const navigate = useNavigate();
  const { onboarding } = useAcademyData();

  if (!onboarding) return null;

  const completed = STEPS.filter((s) => onboarding[s.key]).length;
  if (completed === 3) return null;

  return (
    <Card className="vault-card p-5 max-w-2xl">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-foreground tracking-wide uppercase">Onboarding</p>
        <span className="text-xs text-muted-foreground font-medium">{completed}/3</span>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completed / 3) * 100}%` }}
        />
      </div>

      <div className="space-y-1">
        {STEPS.map((step) => {
          const done = onboarding[step.key];
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              onClick={() => !done && navigate(step.route)}
              disabled={done}
              className={cn(
                "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                done
                  ? "opacity-60 cursor-default"
                  : "hover:bg-muted/50 cursor-pointer group"
              )}
            >
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center shrink-0 border",
                  done
                    ? "bg-primary border-primary"
                    : "border-border group-hover:border-primary/40"
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <Icon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm flex-1",
                  done ? "line-through text-muted-foreground" : "text-foreground font-medium"
                )}
              >
                {step.label}
              </span>
              {!done && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
