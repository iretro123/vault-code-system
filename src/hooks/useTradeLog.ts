import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

const CACHE_KEY = "va_cache_trade_entries";

function readCache(): TradeEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function writeCache(data: TradeEntry[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

export interface TradeEntry {
  id: string;
  user_id: string;
  trade_date: string;
  risk_used: number;
  risk_reward: number;
  followed_rules: boolean;
  emotional_state: number;
  notes: string | null;
  created_at: string;
}

export interface NewTradeEntry {
  risk_used: number;
  risk_reward: number;
  followed_rules: boolean;
  emotional_state: number;
  notes?: string;
}

export function useTradeLog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const cached = readCache();
  const [entries, setEntries] = useState<TradeEntry[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (user) {
      fetchEntries();
    } else {
      setEntries([]);
      setLoading(false);
    }
  }, [user]);

  async function fetchEntries() {
    try {
      const { data, error } = await supabase
        .from("trade_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const result = data || [];
      writeCache(result);
      setEntries(result);
    } catch (error) {
      console.error("Error fetching trade entries:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addEntry(entry: NewTradeEntry) {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { data, error } = await supabase
        .from("trade_entries")
        .insert({
          user_id: user.id,
          ...entry,
        })
        .select()
        .single();

      if (error) throw error;

      setEntries((prev) => [data, ...prev]);
      toast({
        title: "Trade logged",
        description: "Your trade has been recorded.",
      });
      return { error: null, data };
    } catch (error) {
      console.error("Error adding trade entry:", error);
      toast({
        title: "Error logging trade",
        description: "Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  }

  function exportCSV() {
    if (entries.length === 0) return;

    const headers = ["Date", "Symbol", "P/L ($)", "Win/Loss", "Plan Followed", "Emotional State", "Notes"];
    const rows = entries.map((e) => {
      const pnl = e.risk_reward * e.risk_used;
      const outcome = e.risk_reward > 0 ? "Win" : e.risk_reward < 0 ? "Loss" : "Breakeven";
      const ticker = e.notes?.split(" ")[0] || "";
      return [
        e.trade_date,
        ticker,
        pnl.toFixed(2),
        outcome,
        e.followed_rules ? "Yes" : "No",
        String(e.emotional_state),
        `"${(e.notes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vault-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    entries,
    loading,
    addEntry,
    exportCSV,
    refetch: fetchEntries,
  };
}
