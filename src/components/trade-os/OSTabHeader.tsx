import { Calendar, Radio, ClipboardCheck, Brain, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionStage } from "@/hooks/useSessionStage";

const TABS: { key: SessionStage; label: string; icon: typeof Calendar; step: number }[] = [
  { key: "plan", label: "Plan", icon: Calendar, step: 1 },
  { key: "live", label: "Live", icon: Radio, step: 2 },
  { key: "review", label: "Review", icon: ClipboardCheck, step: 3 },
  { key: "insights", label: "Insights", icon: Brain, step: 4 },
];

const STAGE_GUIDANCE: Record<SessionStage, string> = {
  plan: "Size your trade. The calculator approves or denies based on your account rules.",
  live: "Session active. Monitor your plan, track risk, follow your rules.",
  review: "Log your result. Record mistakes, lessons, and complete today's check-in.",
  insights: "AI scanned your behavior. See your risk grade, biggest leak, and next action.",
};

interface OSTabHeaderProps {
  activeStage: SessionStage;
  stageStatus: (stage: SessionStage) => "completed" | "active" | "upcoming";
  onSelect: (stage: SessionStage) => void;
}

export function OSTabHeader({ activeStage, stageStatus, onSelect }: OSTabHeaderProps) {
  return (
    <div className="px-2.5 md:px-3 pt-2 pb-1 space-y-1">
      <div className="flex items-center gap-0.5 rounded-lg bg-black/40 p-0.5">
        {TABS.map((tab) => {
          const status = stageStatus(tab.key);
          const isActive = activeStage === tab.key;
          const Icon = tab.icon;
          const isCompleted = status === "completed";
          return (
            <button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold tracking-tight transition-all duration-100 rounded-md",
                isActive
                  ? "bg-primary/15 text-primary shadow-[inset_0_-2px_0_0_hsl(var(--primary))]"
                  : isCompleted
                    ? "text-emerald-400/80 hover:text-emerald-400 hover:bg-white/[0.04]"
                    : "text-muted-foreground/50 hover:text-muted-foreground/70 hover:bg-white/[0.04]"
              )}
            >
              {isCompleted && !isActive ? (
                <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500/20 shrink-0">
                  <Check className="h-2 w-2 text-emerald-400" strokeWidth={3} />
                </span>
              ) : isActive ? (
                <Icon className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground/30 shrink-0">
                  {tab.step}
                </span>
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-foreground/50 font-medium leading-snug px-0.5">
        {STAGE_GUIDANCE[activeStage]}
      </p>
    </div>
  );
}
