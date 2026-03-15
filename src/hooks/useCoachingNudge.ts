import { useMemo, useCallback } from "react";
import type { TradeEntry } from "./useTradeLog";

export type NudgeTrigger = "streak" | "drawdown" | "compliance" | "emotional";

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCooldownKey(trigger: NudgeTrigger) {
  return `va_coaching_nudge_${trigger}`;
}

function isOnCooldown(trigger: NudgeTrigger): boolean {
  try {
    const ts = localStorage.getItem(getCooldownKey(trigger));
    if (!ts) return false;
    return Date.now() - Number(ts) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function writeCooldown(trigger: NudgeTrigger) {
  try {
    localStorage.setItem(getCooldownKey(trigger), String(Date.now()));
  } catch {}
}

interface NudgeInput {
  entries: TradeEntry[];
  totalPnl: number;
  startingBalance: number | null;
  complianceRate: number;
}

interface NudgeResult {
  shouldShow: boolean;
  triggerType: NudgeTrigger | null;
  dismiss: () => void;
}

export function useCoachingNudge({ entries, totalPnl, startingBalance, complianceRate }: NudgeInput): NudgeResult {
  const result = useMemo((): { shouldShow: boolean; triggerType: NudgeTrigger | null } => {
    if (entries.length === 0) return { shouldShow: false, triggerType: null };

    // 1. 3+ consecutive losses (newest first)
    if (!isOnCooldown("streak")) {
      let streak = 0;
      for (const e of entries) {
        if (e.risk_reward < 0) streak++;
        else break;
      }
      if (streak >= 3) return { shouldShow: true, triggerType: "streak" };
    }

    // 2. Drawdown > 10%
    if (!isOnCooldown("drawdown") && startingBalance && startingBalance > 0) {
      const drawdownPct = totalPnl / startingBalance;
      if (drawdownPct < -0.10) return { shouldShow: true, triggerType: "drawdown" };
    }

    // 3. Compliance < 40% with 5+ trades
    if (!isOnCooldown("compliance") && entries.length >= 5 && complianceRate < 40) {
      return { shouldShow: true, triggerType: "compliance" };
    }

    // 4. 3+ emotional trades in last 5
    if (!isOnCooldown("emotional")) {
      const last5 = entries.slice(0, 5);
      const emotionalCount = last5.filter((e) => e.emotional_state >= 3).length;
      if (emotionalCount >= 3) return { shouldShow: true, triggerType: "emotional" };
    }

    return { shouldShow: false, triggerType: null };
  }, [entries, totalPnl, startingBalance, complianceRate]);

  const dismiss = useCallback(() => {
    if (result.triggerType) writeCooldown(result.triggerType);
  }, [result.triggerType]);

  return { ...result, dismiss };
}
