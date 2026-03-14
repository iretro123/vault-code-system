import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

const CACHE_KEY = "va_cache_trade_entries";
const CACHE_TS_KEY = "va_cache_trade_entries_ts";
const STALE_MS = 30_000; // 30 seconds

function readCache(): TradeEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function writeCache(data: TradeEntry[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {}
}

function isCacheStale(): boolean {
  try {
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!ts) return true;
    return Date.now() - Number(ts) > STALE_MS;
  } catch { return true; }
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
  symbol?: string;
  outcome?: string;
  plan_id?: string;
}

export interface NewTradeEntry {
  risk_used: number;
  risk_reward: number;
  followed_rules: boolean;
  emotional_state: number;
  notes?: string;
  symbol?: string;
  outcome?: string;
  trade_date?: string;
  plan_id?: string;
}

export interface EquityPoint {
  date: string;
  balance: number;
}

export interface SymbolStat {
  symbol: string;
  trades: number;
  wins: number;
  winRate: number;
  totalPnl: number;
}

export interface DayStat {
  day: string;
  trades: number;
  wins: number;
  winRate: number;
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
      const { data, error } = await (supabase.from("trade_entries" as any) as any)
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

  // ── Computed metrics ──

  // Fix: P/L = risk_reward * risk_used (risk_reward is +1/-1/0, risk_used is absolute $)
  const computePnl = (e: TradeEntry) => e.risk_reward * e.risk_used;

  const allTimeWinRate = useMemo(() => {
    if (entries.length === 0) return 0;
    const wins = entries.filter((e) => e.risk_reward > 0).length;
    return Math.round((wins / entries.length) * 100);
  }, [entries]);

  const complianceRate = useMemo(() => {
    if (entries.length === 0) return 0;
    const compliant = entries.filter((e) => e.followed_rules).length;
    return Math.round((compliant / entries.length) * 100);
  }, [entries]);

  const currentStreak = useMemo(() => {
    // Consecutive trades (newest first) where followed_rules is true
    let streak = 0;
    for (const e of entries) {
      if (e.followed_rules) streak++;
      else break;
    }
    return streak;
  }, [entries]);

  const todayPnl = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return entries
      .filter((e) => e.trade_date === todayStr)
      .reduce((sum, e) => sum + computePnl(e), 0);
  }, [entries]);

  const totalPnl = useMemo(() => {
    return entries.reduce((sum, e) => sum + computePnl(e), 0);
  }, [entries]);

  // Equity curve: sorted oldest-first, running balance
  const equityCurve = useMemo((): EquityPoint[] => {
    if (entries.length === 0) return [];
    const sorted = [...entries].sort((a, b) => a.trade_date.localeCompare(b.trade_date) || a.created_at.localeCompare(b.created_at));
    let running = 0;
    return sorted.map((e) => {
      running += computePnl(e);
      return { date: e.trade_date, balance: running };
    });
  }, [entries]);

  // By symbol breakdown
  const symbolStats = useMemo((): SymbolStat[] => {
    const map = new Map<string, { trades: number; wins: number; totalPnl: number }>();
    for (const e of entries) {
      const sym = (e.symbol || e.notes?.split(" ")[0] || "Unknown").toUpperCase();
      const existing = map.get(sym) || { trades: 0, wins: 0, totalPnl: 0 };
      existing.trades++;
      if (e.risk_reward > 0) existing.wins++;
      existing.totalPnl += computePnl(e);
      map.set(sym, existing);
    }
    return Array.from(map.entries())
      .map(([symbol, s]) => ({ symbol, ...s, winRate: Math.round((s.wins / s.trades) * 100) }))
      .sort((a, b) => b.trades - a.trades);
  }, [entries]);

  // By day of week
  const dayStats = useMemo((): DayStat[] => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = new Map<number, { trades: number; wins: number }>();
    for (const e of entries) {
      const d = new Date(e.trade_date + "T12:00:00").getDay();
      const existing = map.get(d) || { trades: 0, wins: 0 };
      existing.trades++;
      if (e.risk_reward > 0) existing.wins++;
      map.set(d, existing);
    }
    return Array.from(map.entries())
      .map(([d, s]) => ({ day: days[d], ...s, winRate: s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0 }))
      .sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day));
  }, [entries]);

  async function addEntry(entry: NewTradeEntry) {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { data, error } = await (supabase.from("trade_entries" as any) as any)
        .insert({
          user_id: user.id,
          ...entry,
        })
        .select()
        .single();

      if (error) throw error;

      setEntries((prev) => [data, ...prev]);
      writeCache([data, ...entries]);
      toast({
        title: "Trade logged",
        description: "Your trade has been recorded.",
      });
      return { error: null, data };
    } catch (error: any) {
      console.error("Error adding trade entry:", error);
      const msg = error?.message || error?.details || "Please try again.";
      toast({
        title: "Error logging trade",
        description: msg,
        variant: "destructive",
      });
      return { error };
    }
  }

  function exportCSV() {
    if (entries.length === 0) return;

    const headers = ["Date", "Symbol", "P/L ($)", "Win/Loss", "Plan Followed", "Emotional State", "Notes"];
    const rows = entries.map((e) => {
      const pnl = computePnl(e);
      const outcome = e.risk_reward > 0 ? "Win" : e.risk_reward < 0 ? "Loss" : "Breakeven";
      const ticker = e.symbol || e.notes?.split(" ")[0] || "";
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

  async function deleteEntry(id: string) {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { error } = await (supabase.from("trade_entries" as any) as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      writeCache(updated);
      toast({
        title: "Trade deleted",
        description: "The trade entry has been removed.",
      });
      // Refetch to ensure fresh data after trigger-side effects
      await fetchEntries();
      return { error: null };
    } catch (error: any) {
      console.error("Error deleting trade entry:", error);
      toast({
        title: "Error deleting trade",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  }

  return {
    entries,
    loading,
    addEntry,
    deleteEntry,
    exportCSV,
    refetch: fetchEntries,
    // New computed metrics
    allTimeWinRate,
    complianceRate,
    currentStreak,
    todayPnl,
    totalPnl,
    equityCurve,
    symbolStats,
    dayStats,
  };
}
