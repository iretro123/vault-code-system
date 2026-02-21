import { Check, Shield, BookOpen, TrendingUp, CalendarCheck } from "lucide-react";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Install Risk Rules", icon: Shield, key: "claimed_role" as const },
  { label: "Watch Core Lesson", icon: BookOpen, key: "first_lesson_completed" as const },
  { label: "Post First Trade", icon: TrendingUp, key: "intro_posted" as const },
  { label: "Weekly Review", icon: CalendarCheck, key: null },
];

export function PathMilestonesCard() {
  const { onboarding } = useAcademyData();

  return (
    <div
      className="rounded-2xl p-6 space-y-5 border border-white/[0.10]"
      style={{
        background: "rgba(255,255,255,0.07)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <h3 className="text-base font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
        Your Path
      </h3>

      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-1 bottom-1 w-px" style={{ background: "rgba(255,255,255,0.12)" }} />

        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const done = step.key ? onboarding?.[step.key] ?? false : false;
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-center gap-3 relative">
                <div
                  className={cn(
                    "absolute -left-6 h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0",
                  )}
                  style={{
                    background: done ? "hsl(217,91%,60%)" : "rgba(255,255,255,0.08)",
                    border: done ? "none" : "1.5px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {done ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : (
                    <Icon className="h-3 w-3" style={{ color: "rgba(255,255,255,0.45)" }} />
                  )}
                </div>
                <span
                  className={cn("text-sm", done && "line-through")}
                  style={{ color: done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)", fontWeight: done ? 400 : 500 }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
