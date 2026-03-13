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
    <div className="flex border-b border-border/50">
      {TABS.map((tab) => {
        const status = stageStatus(tab.key);
        const isActive = activeStage === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider transition-all duration-100 relative",
              isActive
                ? "text-primary"
                : status === "completed"
                  ? "text-emerald-400/70 hover:text-emerald-400"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            {status === "completed" && !isActive ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
