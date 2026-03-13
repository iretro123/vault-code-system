import { Calendar, Radio, ClipboardCheck, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionStage } from "@/hooks/useSessionStage";

const TABS: { key: SessionStage; label: string; mobileLabel: string; icon: typeof Calendar }[] = [
  { key: "plan", label: "Plan", mobileLabel: "Plan", icon: Calendar },
  { key: "live", label: "Live", mobileLabel: "Live", icon: Radio },
  { key: "review", label: "Review", mobileLabel: "Review", icon: ClipboardCheck },
  { key: "insights", label: "Insights", mobileLabel: "AI", icon: Brain },
];

interface OSTabHeaderProps {
  activeStage: SessionStage;
  stageStatus: (stage: SessionStage) => "completed" | "active" | "upcoming";
  onSelect: (stage: SessionStage) => void;
}

export function OSTabHeader({ activeStage, stageStatus, onSelect }: OSTabHeaderProps) {
  return (
    <div className="flex items-center gap-1 md:gap-1.5 px-5 md:px-8 pt-4 md:pt-5 pb-0 border-b border-border/20">
      {TABS.map((tab) => {
        const status = stageStatus(tab.key);
        const isActive = activeStage === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "relative flex items-center gap-2 md:gap-2.5 px-4 md:px-5 py-3 md:py-3.5 text-sm md:text-sm font-medium transition-colors duration-100 rounded-t-lg",
              isActive
                ? "text-foreground bg-muted/10"
                : status === "completed"
                  ? "text-emerald-400/70 hover:text-emerald-400 hover:bg-muted/5"
                  : "text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-muted/5"
            )}
          >
            {status === "completed" && !isActive ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            ) : (
              <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
            )}
            <span className="sm:hidden">{tab.mobileLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {/* Active pill indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
