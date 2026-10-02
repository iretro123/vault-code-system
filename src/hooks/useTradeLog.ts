import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

const CACHE_KEY = "va_cache_trade_entries";
function readCache(userId: string | undefined): TradeEntry[] | null {
  if (!userId) return null;
  try {
    const data = JSON.parse(localStorage.getItem(`${CACHE_KEY}:${userId}`) || "null");
    return Array.isArray(data) && data.every(entry => entry?.user_id === userId) ? data : null;
  } catch { return null; }
}
function writeCache(userId: string, data: TradeEntry[]) {
  try { localStorage.setItem(`${CACHE_KEY}:${userId}`, JSON.stringify(data)); } catch { /* Optional cache. */ }
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
  contracts?: number | null;
  actual_pnl?: number | null;
  planned_risk_dollars?: number | null;
  entry_price?: number | null;
  exit_price?: number | null;
  is_oversized?: boolean;
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
  contracts?: number;
  actual_pnl?: number;
  planned_risk_dollars?: number;
  entry_price?: number;
  exit_price?: number;
  is_oversized?: boolean;
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

// Backward-compatible P/L: legacy entries lack `outcome` and used ±1/0 multiplier.
// New entries always set `outcome` (WIN/LOSS/BREAKEVEN) and store signed dollar P/L directly.
export const computePnl = (e: TradeEntry) =>
  e.outcome
    ? e.risk_reward                  // new format: direct dollar P/L
    : e.risk_reward * e.risk_used;   // legacy ±1/0 multiplier format

export function useTradeLog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id;
  const identity = useRef({ userId, generation: 0 });
  if (identity.current.userId !== userId) identity.current = { userId, generation: identity.current.generation + 1 };
  const [state, setState] = useState(() => ({ userId, entries: readCache(userId) ?? [], loading: !!userId }));
  const current = useRef(state);
  current.current = state;
  const request = useRef(0);
  const entries = useMemo(() => state.userId === userId ? state.entries : [], [state, userId]);
  const loading = !!userId && (state.userId !== userId || state.loading);
  const isCurrent = (owner: typeof identity.current) => identity.current === owner;
  const storeEntries = (owner: typeof identity.current, next: TradeEntry[]) => {
    if (!owner.userId || !isCurrent(owner)) return;
    writeCache(owner.userId, next);
    current.current = { userId: owner.userId, entries: next, loading: false };
    setState(current.current);
  };

  useEffect(() => {
    // The old shared cache has no trustworthy owner and must never be imported.
    try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem(`${CACHE_KEY}_ts`); } catch { /* Optional cache. */ }
    const cached = readCache(userId);
    current.current = { userId, entries: cached ?? [], loading: !!userId && !cached };
    setState(current.current);
    if (userId) void fetchEntries();
    return () => { request.current++; identity.current = {...identity.current, generation: identity.current.generation + 1}; };
  }, [userId]);

  async function fetchEntries() {
    const owner = identity.current;
    if (!owner.userId) return;
    const revision = ++request.current;
    try {
      const { data, error } = await supabase.from("trade_entries").select("*")
        .eq("user_id", owner.userId).order("created_at", { ascending: false }).limit(2000);
      if (!isCurrent(owner) || request.current !== revision) return;
      if (error) throw error;
      storeEntries(owner, (data || []).filter(entry => entry.user_id === owner.userId));
    } catch (error: unknown) {
      if (isCurrent(owner)) console.error("Error fetching trade entries:", error);
    } finally {
      if (isCurrent(owner) && request.current === revision) setState(prev => ({...prev, loading: false}));
    }
  }

  // ── Computed metrics ──

  const pnl = computePnl;

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

  // ── Anti-churn rolling metrics ──

  const last10WinRate = useMemo(() => {
    const recent = entries.slice(0, 10);
    if (recent.length === 0) return 0;
    const wins = recent.filter((e) => e.risk_reward > 0).length;
    return Math.round((wins / recent.length) * 100);
  }, [entries]);

  const weeklyComplianceRate = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().slice(0, 10);
    const recent = entries.filter((e) => e.trade_date >= weekStr);
    if (recent.length === 0) return 0;
    const compliant = recent.filter((e) => e.followed_rules).length;
    return Math.round((compliant / recent.length) * 100);
  }, [entries]);

  const bestStreak = useMemo(() => {
    let max = 0;
    let cur = 0;
    // oldest-first for streak calculation
    const sorted = [...entries].sort((a, b) => a.trade_date.localeCompare(b.trade_date) || a.created_at.localeCompare(b.created_at));
    for (const e of sorted) {
      if (e.followed_rules) { cur++; max = Math.max(max, cur); }
      else cur = 0;
    }
    return max;
  }, [entries]);

  const allTimeHigh = useMemo(() => {
    if (equityCurve.length === 0) return 0;
    return Math.max(...equityCurve.map((p) => p.balance));
  }, [equityCurve]);

  async function addEntry(entry: NewTradeEntry) {
    if (!user || identity.current.userId !== user.id) return { error: new Error("Not authenticated") };

    const owner = identity.current;
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

      if (!isCurrent(owner)) return { error: null, data };
      request.current++;
      const nextEntries = [data, ...current.current.entries.filter(e => e.id !== data.id)];
      storeEntries(owner, nextEntries);
      const sym = entry.symbol || "Trade";
      const pnlVal = computePnl(data);
      toast({
        title: "Trade logged",
        description: `${sym} · ${pnlVal >= 0 ? "+" : "-"}$${Math.abs(pnlVal).toFixed(0)}`,
      });
      // Fire-and-forget: trigger AI DNA update after every 5th trade
      const newCount = nextEntries.length;
      if (newCount % 5 === 0) {
        supabase.functions.invoke("update-trader-dna").catch(() => {});
      }
      return { error: null, data };
    } catch (error: unknown) {
      if (!isCurrent(owner)) return { error };
      console.error("Error adding trade entry:", error);
      const err = error as { message?: string; details?: string };
      const msg = err?.message || err?.details || "Please try again.";
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
    if (!user || identity.current.userId !== user.id) return { error: new Error("Not authenticated") };

    const owner = identity.current;
    try {
      const { error } = await supabase
        .from("trade_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      if (!isCurrent(owner)) return { error: null };
      request.current++;
      storeEntries(owner, current.current.entries.filter((e) => e.id !== id));
      toast({
        title: "Trade deleted",
        description: "The trade entry has been removed.",
      });
      // Refetch to ensure fresh data after trigger-side effects
      await fetchEntries();
      return { error: null };
    } catch (error: unknown) {
      if (!isCurrent(owner)) return { error };
      console.error("Error deleting trade entry:", error);
      toast({
        title: "Error deleting trade",
        description: (error as { message?: string } | null)?.message || "Please try again.",
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
    // Computed metrics
    allTimeWinRate,
    complianceRate,
    currentStreak,
    todayPnl,
    totalPnl,
    equityCurve,
    symbolStats,
    dayStats,
    // Anti-churn rolling metrics
    last10WinRate,
    weeklyComplianceRate,
    bestStreak,
    allTimeHigh,
  };
}
