import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReferralStats {
  total_signed_up: number;
  total_paid: number;
  current_streak_weeks: number;
  last_referral_at: string | null;
}

export function useReferralStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats>({
    total_signed_up: 0,
    total_paid: 0,
    current_streak_weeks: 0,
    last_referral_at: null,
  });
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("referral_stats")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const row = data as {
        total_signed_up?: number;
        total_paid?: number;
        current_streak_weeks?: number;
        last_referral_at?: string | null;
      };
      setStats({
        total_signed_up: row.total_signed_up ?? 0,
        total_paid: row.total_paid ?? 0,
        current_streak_weeks: row.current_streak_weeks ?? 0,
        last_referral_at: row.last_referral_at ?? null,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, refetch };
}
