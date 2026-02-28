import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;
const CACHE_KEY = "va_cache_hot_tickers";

function readCache(): string[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const { data, ts } = JSON.parse(raw);
    // 5-minute TTL for initial render; background refresh always runs
    if (Date.now() - ts > 5 * 60 * 1000) return [];
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function writeCache(data: string[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export function useHotTickers() {
  const [tickers, setTickers] = useState<string[]>(() => readCache());
  const inFlight = useRef(false);

  const fetchTickers = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("academy_messages")
        .select("body")
        .eq("room_slug", "trade-floor")
        .eq("is_deleted", false)
        .gte("created_at", since)
        .limit(200);

      if (!data) return;

      const counts = new Map<string, number>();
      for (const msg of data) {
        const matches = msg.body.matchAll(TICKER_REGEX);
        for (const m of matches) {
          const t = m[1];
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }

      const sorted = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t]) => t);

      // Only update if different
      setTickers((prev) => {
        if (prev.length === sorted.length && prev.every((t, i) => t === sorted[i])) return prev;
        writeCache(sorted);
        return sorted;
      });
    } catch {
      // silent
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    const interval = setInterval(fetchTickers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTickers]);

  return tickers;
}
