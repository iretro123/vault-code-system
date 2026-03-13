import { Calendar, Radio, ClipboardCheck, Brain, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionStage } from "@/hooks/useSessionStage";

const TABS: { key: SessionStage; label: string; icon: typeof Calendar; step: number }[] = [
  { key: "plan", label: "Plan", icon: Calendar, step: 1 },
  { key: "live", label: "Live", icon: Radio, step: 2 },
  { key: "review", label: "Review", icon: ClipboardCheck, step: 3 },
  { key: "insights", label: "Insights", icon: Brain, step: 4 },
];

const STAGE_DESCRIPTIONS: Record<SessionStage, string> = {
  plan: "Build your trade plan. Enter ticker, direction, entry, stop, and target — the calculator sizes and approves.",
  live: "Session active. Monitor your plan, track risk, follow your rules. Log the result when the trade closes.",
  review: "Log your trade result, record mistakes and lessons, and complete your daily check-in.",
  insights: "AI analyzes your trading behavior. See your risk grade, biggest leak, strongest edge, and next action.",
};

interface OSTabHeaderProps {
  activeStage: SessionStage;
  stageStatus: (stage: SessionStage) => "completed" | "active" | "upcoming";
  onSelect: (stage: SessionStage) => void;
}

export function OSTabHeader({ activeStage, stageStatus, onSelect }: OSTabHeaderProps) {
  return (
    <div className="px-3 md:px-5 pt-3 pb-1 space-y-1.5">
      <div className="flex items-center gap-0.5 rounded-xl bg-black/25 p-1 border border-white/[0.04]">
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
                "relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] transition-all duration-100 rounded-lg",
                isActive
                  ? "bg-white/[0.08] text-foreground shadow-sm"
                  : isCompleted
                    ? "text-emerald-400/70 hover:text-emerald-400/90 hover:bg-white/[0.03]"
                    : "text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-white/[0.03]"
              )}
            >
              {isCompleted && !isActive ? (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 shrink-0">
                  <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
                </span>
              ) : isActive ? (
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground/25 shrink-0">{tab.step}</span>
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
      {/* Stage description microcopy */}
      <p className="text-[11px] text-muted-foreground/50 leading-relaxed px-1">
        {STAGE_DESCRIPTIONS[activeStage]}
      </p>
    </div>
  );
}
