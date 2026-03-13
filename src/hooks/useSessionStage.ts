import { useState, useMemo, useCallback } from "react";

export type SessionStage = "plan" | "live" | "review" | "insights";

interface UseSessionStageInput {
  hasActivePlan: boolean;
  todayTradeCount: number;
  todayStatus: string;
  sessionActive: boolean;
}

export function useSessionStage({ hasActivePlan, todayTradeCount, todayStatus, sessionActive }: UseSessionStageInput) {
  const [manualOverride, setManualOverride] = useState<SessionStage | null>(null);

  const autoStage = useMemo((): SessionStage => {
    // End of day: check-in complete
    if (todayStatus === "complete") return "insights";
    // Post-trade: trades logged but check-in not complete
    if (todayTradeCount > 0 && todayStatus !== "complete") return "review";
    // Live session: plan approved or session active
    if (hasActivePlan || sessionActive) return "live";
    // Default: before market / plan
    return "plan";
  }, [hasActivePlan, todayTradeCount, todayStatus, sessionActive]);

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

  return { activeStage, autoStage, setStage, resetToAuto, stageStatus };
}
