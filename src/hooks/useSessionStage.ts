import { useState, useMemo, useCallback } from "react";
import type { SessionPhaseLabel } from "@/components/trade-os/SessionSetupCard";

export type SessionStage = "plan" | "live" | "review" | "insights";

export type DayState = "no_plan" | "plan_approved" | "live_session" | "review_pending" | "day_complete";

interface UseSessionStageInput {
  hasActivePlan: boolean;
  todayTradeCount: number;
  todayStatus: string;
  sessionActive: boolean;
  sessionTimesSet?: boolean;
  sessionPhase?: SessionPhaseLabel;
}

const DAY_STATE_META: Record<DayState, { stage: SessionStage; status: string; cta: string }> = {
  no_plan:        { stage: "plan",     status: "Set your rules to start",                 cta: "Start Your Day" },
  plan_approved:  { stage: "plan",     status: "Rules set — ready to go live",            cta: "Go Live" },
  live_session:   { stage: "live",     status: "Session active — trade your rules",       cta: "Log Result" },
  review_pending: { stage: "review",   status: "Trades logged — complete your review",    cta: "Complete Review" },
  day_complete:   { stage: "insights", status: "Day complete",                            cta: "View Insights" },
};

export function useSessionStage({ hasActivePlan, todayTradeCount, todayStatus, sessionActive, sessionTimesSet, sessionPhase }: UseSessionStageInput) {
  const [manualOverride, setManualOverride] = useState<SessionStage | null>(null);

  const dayState = useMemo((): DayState => {
    // E: Day Complete
    if (todayStatus === "complete") return "day_complete";
    // D: Review Pending
    if (todayTradeCount > 0 && todayStatus !== "complete") return "review_pending";
    // C: Live Session Active (plan + session times set, or session closed should suggest review)
    if (hasActivePlan && sessionTimesSet) {
      // If session closed, auto-suggest review
      if (sessionPhase === "Session closed") return "review_pending";
      return "live_session";
    }
    // B: Plan Approved (no session times yet)
    if (hasActivePlan) return "plan_approved";
    // A: No Plan Yet
    return "no_plan";
  }, [hasActivePlan, todayTradeCount, todayStatus, sessionTimesSet, sessionPhase]);

  const meta = DAY_STATE_META[dayState];
  const autoStage = meta.stage;
  const activeStage = manualOverride ?? autoStage;

  const setStage = useCallback((stage: SessionStage) => {
    setManualOverride(stage);
  }, []);

  const resetToAuto = useCallback(() => {
    setManualOverride(null);
  }, []);

  const stageStatus = useCallback((stage: SessionStage): "completed" | "active" | "upcoming" => {
    const order: SessionStage[] = ["plan", "live", "review", "insights"];
    const autoIdx = order.indexOf(autoStage);
    const stageIdx = order.indexOf(stage);
    if (stageIdx < autoIdx) return "completed";
    if (stageIdx === autoIdx) return "active";
    return "upcoming";
  }, [autoStage]);

  return {
    activeStage,
    autoStage,
    dayState,
    dayStateStatus: meta.status,
    dayStateCta: meta.cta,
    setStage,
    resetToAuto,
    stageStatus,
  };
}
