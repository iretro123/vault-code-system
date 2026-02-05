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
     disciplineScore,
     canTrade,
     plannedRisk,
     maxRiskAllowed,
     tradesRemaining,
     dailyLossRemaining,
   }: {
     disciplineScore: number;
     canTrade: boolean;
     plannedRisk: number;
     maxRiskAllowed: number;
     tradesRemaining: number;
     dailyLossRemaining: number;
   }): Promise<PreTradeCheckResult> {
     if (!user) {
       return { isCleared: false, violationReason: "Not authenticated" };
     }
 
     // Determine if cleared and violation reasons
     const violations: string[] = [];
     
     if (!canTrade) {
       violations.push("Trading currently locked");
     }
     if (plannedRisk > maxRiskAllowed) {
       violations.push(`Risk ${plannedRisk}% exceeds max ${maxRiskAllowed}%`);
     }
     if (tradesRemaining <= 0) {
       violations.push("No trades remaining today");
     }
     if (plannedRisk > dailyLossRemaining) {
       violations.push(`Risk exceeds remaining daily loss allowance`);
     }
 
     const isCleared = violations.length === 0;
     const violationReason = violations.length > 0 ? violations.join("; ") : null;
 
     setSaving(true);
     try {
       const { error } = await supabase.from("pre_trade_checks").insert({
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
 
       if (error) throw error;
 
       toast({
         title: isCleared ? "Pre-Trade Check Passed" : "Pre-Trade Check Failed",
         description: isCleared 
           ? "You are cleared to trade." 
           : "Trade would violate your rules.",
         variant: isCleared ? "default" : "destructive",
       });
 
       return { isCleared, violationReason };
     } catch (error) {
       console.error("Error saving pre-trade check:", error);
       toast({
         title: "Error",
         description: "Failed to save pre-trade check.",
         variant: "destructive",
       });
       return { isCleared: false, violationReason: "Save failed" };
     } finally {
       setSaving(false);
     }
   }
 
   return { saveCheck, saving };
 }