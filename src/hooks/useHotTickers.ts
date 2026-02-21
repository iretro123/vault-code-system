import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;

export function useHotTickers() {
  const [tickers, setTickers] = useState<string[]>([]);

  const fetchTickers = useCallback(async () => {
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

      setTickers(sorted);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    const interval = setInterval(fetchTickers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTickers]);

  return tickers;
}
