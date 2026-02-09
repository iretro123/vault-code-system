import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Report {
  period_start: string;
  period_end: string;
  days_traded: number;
  green_days: number;
  yellow_days: number;
  red_days: number;
  trades_taken: number;
  trades_blocked: number;
  block_rate: number;
  stability_score: number;
  mode_fit: string | null;
  insight_text: string | null;
}

interface ReportsState {
  weekly: Report | null;
  monthly: Report | null;
  loading: boolean;
  generating: boolean;
}

export function useReports(userId: string | undefined) {
  const [state, setState] = useState<ReportsState>({
    weekly: null,
    monthly: null,
    loading: true,
    generating: false,
  });
  const inFlight = useRef(false);

  const fetchReports = useCallback(async () => {
    if (!userId || inFlight.current) return;
    inFlight.current = true;

    try {
      const [weeklyRes, monthlyRes] = await Promise.all([
        supabase
          .from("weekly_report")
          .select("*")
          .eq("user_id", userId)
          .order("period_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("monthly_report")
          .select("*")
          .eq("user_id", userId)
          .order("period_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setState((prev) => ({
        ...prev,
        weekly: weeklyRes.data as Report | null,
        monthly: monthlyRes.data as Report | null,
        loading: false,
      }));
    } finally {
      inFlight.current = false;
    }
  }, [userId]);

  const generateOnDemand = useCallback(async () => {
    if (!userId) return;
    setState((prev) => ({ ...prev, generating: true }));
    try {
      await Promise.all([
        supabase.rpc("generate_reports_for_user", { _user_id: userId, _period: "weekly" }),
        supabase.rpc("generate_reports_for_user", { _user_id: userId, _period: "monthly" }),
      ]);
      await fetchReports();
    } finally {
      setState((prev) => ({ ...prev, generating: false }));
    }
  }, [userId, fetchReports]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { ...state, generateOnDemand, refetch: fetchReports };
}
