import { Calendar, Radio, ClipboardCheck, Brain, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ApprovedPlan } from "@/hooks/useApprovedPlans";
import type { DayState, SessionStage } from "@/hooks/useSessionStage";

const STAGE_INFO: Record<SessionStage, { icon: typeof Calendar; label: string; desc: string; hint: string }> = {
  plan: {
    icon: Calendar,
    label: "Plan",
    desc: "Pick your ticker, direction, size, and max loss. Approve it before the market opens.",
    hint: "This is step one. No plan = no trade.",
  },
  live: {
    icon: Radio,
    label: "Live",
    desc: "Your plan is locked in. Execute your trade and log the result when you're done.",
    hint: "Stay within your limits. One plan, one trade.",
  },
  review: {
    icon: ClipboardCheck,
    label: "Review",
    desc: "Check if you followed your rules. Complete your daily review to close the day.",
    hint: "Honest review = faster growth.",
  },
  insights: {
    icon: Brain,
    label: "Insights",
    desc: "AI scans your last 50 trades. See your grade, biggest leak, and what to fix next.",
    hint: "Unlocks after 3+ logged trades.",
  },
};

const STAGE_ORDER: SessionStage[] = ["plan", "live", "review", "insights"];

interface OSControlRailProps {
  activePlan: ApprovedPlan | null;
  trackedBalance: number | null;
  vaultAccountBalance: number;
  todayTradeCount: number;
  maxTradesPerDay: number;
  vaultStatus: string;
  lastBlockReason: string | null;
  dayState: DayState;
  dayStateStatus: string;
  dayStateCta: string;
  onQuickAction: () => void;
  onLogFromPlan?: (plan: ApprovedPlan) => void;
  activeStage: SessionStage;
  stageStatus: (stage: SessionStage) => "completed" | "active" | "upcoming";
  onSelectStage: (stage: SessionStage) => void;
}

export function OSControlRail({
  activePlan, vaultStatus, lastBlockReason, activeStage, stageStatus, onSelectStage,
  onLogFromPlan, dayState,
}: OSControlRailProps) {
  const statusDot = vaultStatus === "GREEN" ? "bg-emerald-400" : vaultStatus === "YELLOW" ? "bg-amber-400" : "bg-red-400";

  const current = STAGE_INFO[activeStage];
  const CurrentIcon = current.icon;

  return (
    <div className="space-y-3">
      {/* Section Label */}
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/40 font-semibold pl-0.5">
        Your Workflow
      </p>

      {/* Active Stage Hero */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-3 space-y-2.5 border-l-2 border-l-primary/40">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <CurrentIcon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-primary/70 font-semibold uppercase tracking-wide">You are here</span>
            </div>
            <h4 className="text-sm font-bold text-foreground tracking-tight leading-tight">{current.label}</h4>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-foreground/70 leading-relaxed font-medium">
          {current.desc}
        </p>

        {/* Hint */}
        <p className="text-[10px] text-muted-foreground/50 italic leading-snug">
          {current.hint}
        </p>
      </div>

      {/* Stage Roadmap */}
      <div className="space-y-0.5">
        {STAGE_ORDER.filter(s => s !== activeStage).map((stage) => {
          const info = STAGE_INFO[stage];
          const status = stageStatus(stage);
          const Icon = info.icon;
          const isCompleted = status === "completed";

          return (
            <button
              key={stage}
              onClick={() => onSelectStage(stage)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group text-left"
            >
              {isCompleted ? (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 shrink-0">
                  <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
                </span>
              ) : (
                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.04] shrink-0">
                  <Icon className="h-3 w-3 text-muted-foreground/40" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-[11px] font-semibold block leading-tight",
                  isCompleted ? "text-emerald-400/60" : "text-muted-foreground/50"
                )}>
                  {info.label}
                </span>
                <span className="text-[10px] text-muted-foreground/30 leading-snug block truncate">
                  {info.desc.split(".")[0]}.
                </span>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
            </button>
          );
        })}
      </div>

      <div className="h-px bg-white/[0.04]" />

      {/* Vault Status */}
      <div className="flex items-center gap-2 px-0.5">
        <span className={cn("w-[6px] h-[6px] rounded-full shrink-0", statusDot, vaultStatus === "GREEN" && "shadow-[0_0_8px_rgba(52,211,153,0.5)]")} />
        <span className="text-[10px] text-muted-foreground/50 font-medium">
          Vault: {vaultStatus === "GREEN" ? "Clear" : vaultStatus === "YELLOW" ? "Caution" : "Blocked"}
        </span>
      </div>

      {/* Active Plan Summary */}
      {activePlan && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold text-foreground">{activePlan.ticker || "—"}</span>
            <span className="text-[10px] text-muted-foreground/50">{activePlan.direction} · {activePlan.contracts_planned}ct</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 pl-3">
            ${Number(activePlan.entry_price_planned).toFixed(2)} · Max ${Number(activePlan.max_loss_planned).toFixed(0)}
          </p>
          {onLogFromPlan && dayState === "live_session" && (
            <button
              onClick={() => onLogFromPlan(activePlan)}
              className="w-full flex items-center justify-center gap-1 h-7 text-[10px] font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition-colors mt-1"
            >
              <CheckCircle2 className="h-3 w-3" /> Log Result
            </button>
          )}
        </div>
      )}

      {/* Block Reason */}
      {lastBlockReason && (
        <div className="flex items-start gap-1.5 px-0.5">
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-400/70 leading-snug">{lastBlockReason}</p>
        </div>
      )}
    </div>
  );
}
