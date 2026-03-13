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
    <div className="px-3 md:px-5 pt-3 pb-1">
      <div className="flex items-center gap-0.5 rounded-xl bg-black/25 p-1 border border-white/[0.04]">
        {TABS.map((tab) => {
          const status = stageStatus(tab.key);
          const isActive = activeStage === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] transition-all duration-100 rounded-lg",
                isActive
                  ? "bg-white/[0.08] text-foreground shadow-sm"
                  : status === "completed"
                    ? "text-emerald-400/70 hover:text-emerald-400/90 hover:bg-white/[0.03]"
                    : "text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-white/[0.03]"
              )}
            >
              {status === "completed" && !isActive ? (
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 shrink-0" />
              ) : isActive ? (
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : null}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
