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
      .from("referral_stats" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setStats({
        total_signed_up: (data as any).total_signed_up ?? 0,
        total_paid: (data as any).total_paid ?? 0,
        current_streak_weeks: (data as any).current_streak_weeks ?? 0,
        last_referral_at: (data as any).last_referral_at ?? null,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, refetch };
}
