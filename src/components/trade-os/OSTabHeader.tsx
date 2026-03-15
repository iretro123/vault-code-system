import { Calendar, Radio, ClipboardCheck, Brain, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SessionStage } from "@/hooks/useSessionStage";

const TABS: { key: SessionStage; label: string; icon: typeof Calendar }[] = [
  { key: "plan", label: "Plan", icon: Calendar },
  { key: "live", label: "Live", icon: Radio },
  { key: "review", label: "Review", icon: ClipboardCheck },
  { key: "insights", label: "Insights", icon: Brain },
];


interface OSTabHeaderProps {
  activeStage: SessionStage;
  stageStatus: (stage: SessionStage) => "completed" | "active" | "upcoming";
  onSelect: (stage: SessionStage) => void;
}

export function OSTabHeader({ activeStage, stageStatus, onSelect }: OSTabHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <div className="px-2.5 pt-2.5 pb-0">
      <div className="flex items-center rounded-[10px] bg-black/30 p-[3px]">
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
                "relative flex-1 flex items-center justify-center gap-1.5 px-2 py-[9px] font-semibold tracking-tight transition-all duration-100 rounded-[8px]",
                isMobile ? "text-[10px] min-h-[40px]" : "text-[11px]",
                isActive
                  ? "bg-white/[0.14] text-foreground font-bold shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06),0_0_8px_rgba(59,130,246,0.15)]"
                  : isCompleted
                    ? "text-emerald-400/70 hover:text-emerald-400 hover:bg-white/[0.03]"
                    : "text-muted-foreground/60 hover:text-muted-foreground/80 hover:bg-white/[0.03]"
              )}
            >
              {isCompleted && !isActive ? (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 shrink-0">
                  <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
                </span>
              ) : (
                <Icon className={cn("h-3 w-3 shrink-0", isActive ? "text-primary" : "")} />
              )}
              {tab.label}
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
