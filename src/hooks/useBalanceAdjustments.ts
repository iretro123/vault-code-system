import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface BalanceAdjustment {
  id: string;
  user_id: string;
  amount: number;
  adjustment_date: string;
  note: string;
  created_at: string;
}

export function useBalanceAdjustments() {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("balance_adjustments")
      .select("*")
      .eq("user_id", user.id)
      .order("adjustment_date", { ascending: true });
    setAdjustments((data as BalanceAdjustment[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalAdjustments = useMemo(
    () => adjustments.reduce((sum, a) => sum + Number(a.amount), 0),
    [adjustments]
  );

  const addAdjustment = useCallback(async (amount: number, note?: string, date?: string) => {
    if (!user) return false;
    const { error } = await supabase.from("balance_adjustments").insert({
      user_id: user.id,
      amount,
      adjustment_date: date || new Date().toISOString().slice(0, 10),
      note: note || "",
    });
    if (error) return false;
    await fetch();
    return true;
  }, [user, fetch]);

  const removeAdjustment = useCallback(async (id: string) => {
    if (!user) return false;
    const { error } = await supabase
      .from("balance_adjustments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return false;
    setAdjustments((prev) => prev.filter((a) => a.id !== id));
    return true;
  }, [user]);

  return { adjustments, loading, totalAdjustments, addAdjustment, removeAdjustment, refetch: fetch };
}
