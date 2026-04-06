import { cn } from "@/lib/utils";

const TOTAL_STEPS = 8;

export function OnboardingProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            i === current
              ? "w-10 bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.6)]"
              : i < current
              ? "w-3 bg-primary/50"
              : "w-3 bg-white/10"
          )}
        />
      ))}
    </div>
  );
}

interface OnboardingStepProps {
  children: React.ReactNode;
  active: boolean;
}

export function OnboardingStep({ children, active }: OnboardingStepProps) {
  if (!active) return null;
  return (
    <div className="animate-fade-in flex flex-col items-center w-full max-w-md mx-auto px-5">
      {children}
    </div>
  );
}
