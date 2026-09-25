import { useEffect, useState } from "react";
import type { PulseFeed } from "@/lib/spxPulse";

const empty: PulseFeed = { posts: [], receivedAt: null, indicatorAt: {}, sessionOpen: false };
export function usePulseFeed(source: "cloud" | "local", enabled: boolean) {
  const [feed, setFeed] = useState<PulseFeed>(empty);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) { setConnected(false); return; }
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
      const refresh = async () => {
        if (stopped) return;
        if (busy) { requested = true; return; }
        busy = true;
        const generation = authGeneration;
        try {
          const { data, error: failure } = await (supabase as any).rpc("pulse_feed_current");
          if (stopped || generation !== authGeneration) return;
          if (failure) {
            setConnected(false);
            if (failure.code === "42501") {
              setFeed(empty);
              setError("Pulse is available with an active Vault membership.");
            } else setError("Pulse is reconnecting. New updates will appear when the connection returns.");
            return;
          }
          const next = data as PulseFeed;
          if (!Array.isArray(next?.posts)) throw new Error("Invalid feed");
          // Fetch a bounded full window so later image changes to older posts are included.
          setFeed({ ...next, posts: [...next.posts].sort((a,b) => a.at-b.at || a.id.localeCompare(b.id)).slice(-100) });
          setConnected(true); setError(null);
        } catch { if (!stopped) { setConnected(false); setError("Pulse is reconnecting. Your saved updates will return shortly."); } }
        finally { busy = false; if (requested && !stopped) { requested = false; void refresh(); } }
      };
      const channel = supabase.channel("vault-spy-pulse-members")
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_status" }, () => void refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_events" }, () => void refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_spy_status" }, () => void refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_spy_events" }, () => void refresh())
        .subscribe(status => { if (status === "SUBSCRIBED") void refresh(); });
      const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
        const userId = session?.user.id || null;
        if (userId !== currentUser) { currentUser=userId; authGeneration++; setFeed(empty); setConnected(false); }
        // Keep database operations outside the auth callback's internal lock.
        queueMicrotask(() => { if (!stopped) void refresh(); });
      });
      const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
      const timer = setInterval(onVisible,30000);
      window.addEventListener("online",onVisible);
      document.addEventListener("visibilitychange",onVisible);
      cleanup = () => { clearInterval(timer); auth.subscription.unsubscribe(); void supabase.removeChannel(channel); window.removeEventListener("online",onVisible); document.removeEventListener("visibilitychange",onVisible); };
      void refresh();
    }).catch(() => { if (!stopped) { setConnected(false); setError("Pulse is unable to connect. Please try again."); } });
    return () => { stopped=true; cleanup(); };
  }, [source,enabled]);
  return { feed, connected, error };
}
