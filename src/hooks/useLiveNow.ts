import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveNowSession {
  id: string;
  title: string;
  join_url: string;
  session_date: string;
  duration_minutes: number;
  status: string;
  is_manual_live?: boolean;
}

const MAX_LIVE_MINUTES = 120;

function isStillLive(session: LiveNowSession) {
  const start = new Date(session.session_date).getTime();
  const durationMs = (session.duration_minutes || MAX_LIVE_MINUTES) * 60_000;
  return Date.now() < start + durationMs;
}

export function useLiveNow() {
  const [liveSession, setLiveSession] = useState<LiveNowSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("live_sessions")
      .select("id,title,join_url,session_date,duration_minutes,status,is_manual_live")
      .eq("status", "live")
      .order("session_date", { ascending: false })
      .limit(1);

    const session = (data as LiveNowSession[] | null)?.[0] ?? null;
    if (session && isStillLive(session)) {
      setLiveSession(session);
    } else {
      setLiveSession(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabase
      .channel("live-now-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { liveSession, loading, refresh };
}
