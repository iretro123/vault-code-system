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
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching trade entries:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addEntry(entry: NewTradeEntry) {
    if (!user) return { error: new Error("Not authenticated") };

    // No client-side enforcement — server RPCs and RLS are the authority
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

  async function deleteEntry(id: string) {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("trade_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast({
        title: "Trade deleted",
        description: "Entry has been removed.",
      });
      return { error: null };
    } catch (error) {
      console.error("Error deleting trade entry:", error);
      return { error };
    }
  }

  return {
    entries,
    loading,
    addEntry,
    deleteEntry,
    refetch: fetchEntries,
  };
}
