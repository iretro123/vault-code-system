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
    <div className="flex items-center gap-1 px-4 md:px-6 bg-muted/[0.03] border-b border-border/10">
      {TABS.map((tab) => {
        const status = stageStatus(tab.key);
        const isActive = activeStage === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "relative flex items-center gap-2 px-4 md:px-5 py-3.5 md:py-4 text-[12px] md:text-[13px] font-bold uppercase tracking-[0.08em] transition-colors duration-75 rounded-t-lg",
              isActive
                ? "text-foreground"
                : status === "completed"
                  ? "text-emerald-400/50 hover:text-emerald-400/80"
                  : "text-muted-foreground/30 hover:text-muted-foreground/60"
            )}
          >
            {status === "completed" && !isActive ? (
              <span className="w-[6px] h-[6px] rounded-full bg-emerald-400 shrink-0" />
            ) : (
              <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "opacity-50")} />
            )}
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-t-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
