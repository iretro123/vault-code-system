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
    <div className="px-3 md:px-4 pt-3 pb-1">
      <div className="flex items-center gap-0.5 rounded-lg bg-muted/5 p-0.5">
        {TABS.map((tab) => {
          const status = stageStatus(tab.key);
          const isActive = activeStage === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] transition-all duration-100 rounded-md",
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : status === "completed"
                    ? "text-emerald-400/60 hover:text-emerald-400/80 hover:bg-card/30"
                    : "text-muted-foreground/35 hover:text-muted-foreground/55 hover:bg-card/30"
              )}
            >
              {status === "completed" && !isActive ? (
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 shrink-0" />
              ) : isActive ? (
                <Icon className="h-3 w-3 shrink-0 text-primary" />
              ) : null}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
