import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Calendar, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface LiveSession {
  id: string;
  title: string;
  session_date: string;
  session_type: string;
}

const LIVE_DASH_CACHE = "va_cache_live_dash";

function readLiveDashCache(): LiveSession[] {
  try {
    const raw = localStorage.getItem(LIVE_DASH_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function LiveCallsCard() {
  const navigate = useNavigate();
  const cached = readLiveDashCache();
  const [sessions, setSessions] = useState<LiveSession[]>(cached);
  const [loading, setLoading] = useState(localStorage.getItem(LIVE_DASH_CACHE) === null);

  useEffect(() => {
    supabase
      .from("live_sessions")
      .select("id, title, session_date, session_type")
      .gte("session_date", new Date(Date.now() - 3 * 60 * 60_000).toISOString())
      .order("session_date", { ascending: true })
      .limit(5)
      .then(({ data }) => {
        const result = data ?? [];
        setSessions(result);
        try { localStorage.setItem(LIVE_DASH_CACHE, JSON.stringify(result)); } catch {}
        setLoading(false);
      });
  }, []);

  return (
    <div className="vault-luxury-card p-6 md:p-8 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-rose-500/15 flex items-center justify-center">
          <Video className="h-4.5 w-4.5 text-rose-400" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Upcoming LIVE Calls</h2>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="space-y-2 animate-pulse">
          {[1,2].map(i => <div key={i} className="h-14 rounded-xl bg-white/[0.03]" />)}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No upcoming calls scheduled. Check back soon.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors duration-100 hover:bg-white/[0.06]"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Play className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/90 truncate">{s.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(s.session_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}EST
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground/60 shrink-0">
                {s.session_type}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2.5">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 flex-1"
          onClick={() => navigate("/academy/live")}
        >
          <Calendar className="h-3.5 w-3.5" />
          View Event Calendar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 flex-1"
          onClick={() => navigate("/academy/live")}
        >
          <Play className="h-3.5 w-3.5" />
          Watch Replays
        </Button>
      </div>
    </div>
  );
}
