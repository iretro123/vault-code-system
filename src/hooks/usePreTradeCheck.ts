import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface PreTradeCheckResult {
  isCleared: boolean;
  violationReason: string | null;
}

export function usePreTradeCheck() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  async function saveCheck({
    plannedRisk,
  }: {
    plannedRisk: number;
  }): Promise<PreTradeCheckResult> {
    if (!user) {
      return { isCleared: false, violationReason: "Not authenticated" };
    }

    setSaving(true);
    try {
      // Server is the single authority for trade permission
      const { data: permData, error: permError } = await supabase.rpc("check_trade_permission", {
        _user_id: user.id,
      });

      if (permError) throw permError;

      const perm = permData && permData.length > 0 ? permData[0] : null;
      if (!perm) throw new Error("No permission data returned");

      const canTrade = perm.can_trade;
      const maxRiskAllowed = Number(perm.max_risk_per_trade);
      const tradesRemaining = perm.trades_remaining;
      const dailyLossRemaining = Number(perm.daily_loss_remaining);
      const disciplineScore = Number(perm.discipline_score);

      // Server determines clearance
      const violations: string[] = [];
      if (!canTrade) violations.push(perm.reason);
      if (plannedRisk > maxRiskAllowed) violations.push(`Risk $${plannedRisk} exceeds max $${maxRiskAllowed}`);
      if (plannedRisk > dailyLossRemaining) violations.push(`Risk exceeds remaining daily loss $${dailyLossRemaining.toFixed(0)}`);

      const isCleared = violations.length === 0;
      const violationReason = violations.length > 0 ? violations.join("; ") : null;

      // Log the check result
      await supabase.from("pre_trade_checks").insert({
        user_id: user.id,
        discipline_score: disciplineScore,
        can_trade: canTrade,
        planned_risk: plannedRisk,
        max_risk_allowed: maxRiskAllowed,
        trades_remaining: tradesRemaining,
        daily_loss_remaining: dailyLossRemaining,
        is_cleared: isCleared,
        violation_reason: violationReason,
      });

      toast({
        title: isCleared ? "Pre-Trade Check Passed" : "Pre-Trade Check Failed",
        description: isCleared
          ? "You are cleared to trade."
          : "Trade would violate your rules.",
        variant: isCleared ? "default" : "destructive",
      });

      return { isCleared, violationReason };
    } catch (error) {
      console.error("Error running pre-trade check:", error);
      toast({
        title: "Error",
        description: "Failed to run pre-trade check.",
        variant: "destructive",
      });
      return { isCleared: false, violationReason: "Check failed" };
    } finally {
      setSaving(false);
    }
  }

  return { saveCheck, saving };
}
