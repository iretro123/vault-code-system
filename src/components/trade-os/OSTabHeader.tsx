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
    <div className="flex items-center gap-1 px-3 md:px-5 pt-3 pb-2 border-b border-border/20 bg-muted/5">
      {TABS.map((tab) => {
        const status = stageStatus(tab.key);
        const isActive = activeStage === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-100",
              isActive
                ? "bg-primary/10 text-primary shadow-sm"
                : status === "completed"
                  ? "text-emerald-400/80 hover:bg-muted/30 hover:text-emerald-400"
                  : "text-muted-foreground/50 hover:bg-muted/20 hover:text-muted-foreground"
            )}
          >
            {status === "completed" && !isActive ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            ) : (
              <Icon className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
