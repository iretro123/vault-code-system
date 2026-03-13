import { Calendar, Radio, ClipboardCheck, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
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
  return (
    <div className="flex items-center px-5 md:px-8 pt-1 border-b border-border/15">
      {TABS.map((tab) => {
        const status = stageStatus(tab.key);
        const isActive = activeStage === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "relative flex items-center gap-2.5 px-5 md:px-6 py-4 md:py-[18px] text-[13px] md:text-sm font-semibold tracking-wide transition-colors duration-75",
              isActive
                ? "text-foreground"
                : status === "completed"
                  ? "text-emerald-400/60 hover:text-emerald-400"
                  : "text-muted-foreground/40 hover:text-muted-foreground/70"
            )}
          >
            {status === "completed" && !isActive ? (
              <span className="w-[7px] h-[7px] rounded-full bg-emerald-400 shrink-0" />
            ) : (
              <Icon className={cn("h-[15px] w-[15px] shrink-0", isActive && "text-primary")} />
            )}
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
