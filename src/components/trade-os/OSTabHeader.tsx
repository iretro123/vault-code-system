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
    <div className="flex items-center gap-0.5 px-3 md:px-4 pt-1 pb-0">
      {TABS.map((tab) => {
        const status = stageStatus(tab.key);
        const isActive = activeStage === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors duration-75 rounded-md",
              isActive
                ? "text-foreground bg-muted/10"
                : status === "completed"
                  ? "text-emerald-400/50 hover:text-emerald-400/70"
                  : "text-muted-foreground/30 hover:text-muted-foreground/50"
            )}
          >
            {status === "completed" && !isActive ? (
              <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 shrink-0" />
            ) : isActive ? (
              <Icon className="h-3 w-3 shrink-0 text-primary" />
            ) : null}
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
