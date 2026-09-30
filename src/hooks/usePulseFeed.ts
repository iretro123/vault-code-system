import { useEffect, useState } from "react";
import type { PulseFeed } from "@/lib/spxPulse";

const empty: PulseFeed = { posts: [], receivedAt: null, indicatorAt: {}, sessionOpen: false };
export function usePulseFeed(source: "cloud" | "local", enabled: boolean) {
  const [feed, setFeed] = useState<PulseFeed>(empty);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) { setFeed(empty); setConnected(false); setError(null); return; }
    let stopped = false;
    let cleanup = () => {};
    if (source === "local") {
      if (!import.meta.env.DEV || !["localhost", "127.0.0.1"].includes(location.hostname)) return;
      const stream = new EventSource("/api/spx-pulse/stream");
      stream.onopen = () => setConnected(true);
      stream.onerror = () => setConnected(false);
      stream.addEventListener("feed", event => {
        try { const next = JSON.parse(event.data); if (!Array.isArray(next.posts)) throw new Error(); setFeed(next); setConnected(true); setError(null); }
        catch { setConnected(false); }
      });
      return () => stream.close();
    }
    void import("@/integrations/supabase/client").then(({ supabase }) => {
      if (stopped) return;
      let busy = false;
      let requested = false;
      let currentUser: string | null = null;
      let authGeneration = 0;
      let realtimeReady = false;
      let lastRefreshAt = 0;
      let pendingUntil = 0;
      let refreshFailed = false;
      const refresh = async () => {
        if (stopped) return;
        if (busy) { requested = true; return; }
        busy = true;
        lastRefreshAt = Date.now();
        const generation = authGeneration;
        try {
          const { data, error: failure } = await supabase.rpc("pulse_feed_current", {} as never, { get: true });
          if (stopped || generation !== authGeneration) return;
          if (failure) {
            refreshFailed = true;
            setConnected(false);
            if (failure.code === "42501") {
              setFeed(empty);
              setError("Pulse is available with an active Vault membership.");
            } else setError("Pulse is reconnecting. New updates will appear when the connection returns.");
            return;
          }
          const next = data as unknown as PulseFeed;
          if (!Array.isArray(next?.posts)) throw new Error("Invalid feed");
          refreshFailed = false;
          pendingUntil = Math.max(0,...next.posts.filter(post => post.captureStatus === "pending").map(post => post.at + 90_000));
          // Fetch a bounded full window so later image changes to older posts are included.
          setFeed({ ...next, posts: [...next.posts].sort((a,b) => a.at-b.at || a.id.localeCompare(b.id)).slice(-100) });
          setConnected(true); setError(null);
        } catch { refreshFailed = true; if (!stopped && generation === authGeneration) { setConnected(false); setError("Pulse is reconnecting. Your saved updates will return shortly."); } }
        finally { busy = false; if (requested && !stopped) { requested = false; void refresh(); } }
      };
      const channel = supabase.channel("vault-spy-pulse-members")
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_status" }, () => void refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_events" }, () => void refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_spy_status" }, () => void refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_spy_events" }, () => void refresh())
        .subscribe(status => { if (stopped) return; realtimeReady = status === "SUBSCRIBED"; if (realtimeReady) void refresh(); else if (["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(status)) setConnected(false); });
      const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
        const userId = session?.user.id || null;
        if (userId !== currentUser) { currentUser=userId; authGeneration++; setFeed(empty); setConnected(false); }
        // Keep database operations outside the auth callback's internal lock.
        queueMicrotask(() => { if (!stopped) void refresh(); });
      });
      const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
      // Realtime remains primary. Recover a missing image promptly without
      // polling every member's full feed rapidly all day or while hidden.
      const timer = setInterval(() => {
        const interval = refreshFailed ? 30_000 : pendingUntil > Date.now() ? 3_000 : !realtimeReady ? 6_000 : 30_000;
        if (Date.now()-lastRefreshAt >= interval) onVisible();
      },3_000);
      window.addEventListener("online",onVisible);
      document.addEventListener("visibilitychange",onVisible);
      cleanup = () => { clearInterval(timer); auth.subscription.unsubscribe(); void supabase.removeChannel(channel); window.removeEventListener("online",onVisible); document.removeEventListener("visibilitychange",onVisible); };
      void refresh();
    }).catch(() => { if (!stopped) { setConnected(false); setError("Pulse is unable to connect. Please try again."); } });
    return () => { stopped=true; cleanup(); };
  }, [source,enabled]);
  return { feed, connected, error };
}
