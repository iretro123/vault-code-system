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
    <div className="flex items-center gap-0.5 md:gap-1 px-4 md:px-7 pt-3 md:pt-4 pb-0 border-b border-border/15">
      {TABS.map((tab) => {
        const status = stageStatus(tab.key);
        const isActive = activeStage === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "relative flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors duration-100",
              isActive
                ? "text-foreground"
                : status === "completed"
                  ? "text-emerald-400/70 hover:text-emerald-400"
                  : "text-muted-foreground/50 hover:text-muted-foreground/80"
            )}
          >
            {status === "completed" && !isActive ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            ) : (
              <Icon className={cn("h-3.5 w-3.5 md:h-4 md:w-4 shrink-0", isActive && "text-primary")} />
            )}
            <span className="sm:hidden">{tab.mobileLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {/* Active underline */}
            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
