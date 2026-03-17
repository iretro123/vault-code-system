import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { format } from "date-fns";

export interface ApprovedPlan {
  id: string;
  user_id: string;
  ticker: string | null;
  direction: string;
  entry_price_planned: number;
  contracts_planned: number;
  stop_price_planned: number | null;
  max_loss_planned: number;
  cash_needed_planned: number;
  tp1_planned: number | null;
  tp2_planned: number | null;
  approval_status: string;
  account_balance_snapshot: number;
  trade_loss_limit_snapshot: number;
  daily_left_snapshot: number | null;
  account_level_snapshot: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface NewPlanData {
  ticker?: string;
  direction: string;
  entry_price_planned: number;
  contracts_planned: number;
  stop_price_planned?: number | null;
  max_loss_planned: number;
  cash_needed_planned: number;
  tp1_planned?: number | null;
  tp2_planned?: number | null;
  approval_status: string;
  account_balance_snapshot: number;
  trade_loss_limit_snapshot: number;
  account_level_snapshot?: string;
}

export function useApprovedPlans() {
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState<ApprovedPlan | null>(null);
  const [todayPlans, setTodayPlans] = useState<ApprovedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const getTodayStr = () => {
    const now = new Date();
    return now.getUTCFullYear() + "-" +
      String(now.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(now.getUTCDate()).padStart(2, "0");
  };

  const fetchActivePlan = useCallback(async () => {
    if (!user) { setActivePlan(null); setTodayPlans([]); setLoading(false); return; }

    try {
      const todayStr = getTodayStr();
      // Fetch ALL today's plans (for history) in one query
      const { data: allToday, error } = await (supabase.from("approved_plans" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", todayStr + "T00:00:00Z")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const plans = allToday || [];
      setTodayPlans(plans);
      // Active plan = first one still in "planned" status
      setActivePlan(plans.find((p: ApprovedPlan) => p.status === "planned") || null);
    } catch (err) {
      console.error("Error fetching active plan:", err);
      setActivePlan(null);
      setTodayPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchActivePlan(); }, [fetchActivePlan]);

  const savePlan = useCallback(async (planData: NewPlanData): Promise<{ data: ApprovedPlan | null; error: any; hasExisting: boolean }> => {
    if (!user) return { data: null, error: new Error("Not authenticated"), hasExisting: false };

    // Check for existing active plan
    if (activePlan) {
      return { data: null, error: null, hasExisting: true };
    }

    try {
      const { data, error } = await (supabase.from("approved_plans" as any) as any)
        .insert({
          user_id: user.id,
          ...planData,
        })
        .select()
        .single();

      if (error) throw error;
      setActivePlan(data);
      return { data, error: null, hasExisting: false };
    } catch (err) {
      console.error("Error saving plan:", err);
      return { data: null, error: err, hasExisting: false };
    }
  }, [user, activePlan]);

  const cancelPlan = useCallback(async (planId: string) => {
    try {
      const { error } = await (supabase.from("approved_plans" as any) as any)
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", planId)
        .eq("user_id", user?.id);

      if (error) throw error;
      setActivePlan(null);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [user]);

  const markLogged = useCallback(async (planId: string) => {
    try {
      const { error } = await (supabase.from("approved_plans" as any) as any)
        .update({ status: "logged", updated_at: new Date().toISOString() })
        .eq("id", planId)
        .eq("user_id", user?.id);

      if (error) throw error;
      setActivePlan(null);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, [user]);

  const replaceWithNew = useCallback(async (planData: NewPlanData): Promise<{ data: ApprovedPlan | null; error: any }> => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    // Cancel existing plan first
    if (activePlan) {
      await cancelPlan(activePlan.id);
    }

    try {
      const { data, error } = await (supabase.from("approved_plans" as any) as any)
        .insert({
          user_id: user.id,
          ...planData,
        })
        .select()
        .single();

      if (error) throw error;
      setActivePlan(data);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }, [user, activePlan, cancelPlan]);

  return {
    activePlan,
    todayPlans,
    loading,
    savePlan,
    cancelPlan,
    markLogged,
    replaceWithNew,
    refetch: fetchActivePlan,
  };
}
