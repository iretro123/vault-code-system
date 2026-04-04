import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Video, ArrowRight } from "lucide-react";

interface LiveSession {
  id: string;
  title: string;
  session_date: string;
  duration_minutes: number;
}

function splitCountdown(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { d, h, m, s };
}

export function NextGroupCallCard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("id, title, session_date, duration_minutes")
        .gt("session_date", new Date().toISOString())
        .eq("status", "scheduled")
        .order("session_date", { ascending: true })
        .limit(1);
      setSession(data?.[0] || null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="vault-luxury-card p-6 animate-pulse">
        <div className="h-6 w-40 rounded bg-muted/30 mb-4" />
        <div className="h-12 rounded bg-muted/20" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="vault-luxury-card p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <Video className="h-5 w-5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary/80">
            Next Group Call
          </span>
        </div>
        <p className="text-sm text-muted-foreground">No upcoming calls scheduled.</p>
        <button
          onClick={() => navigate("/academy/live")}
          className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-[0.97]"
        >
          View Calls <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const start = new Date(session.session_date).getTime();
  const diff = start - now;
  const isLive = diff <= 0 && now < start + session.duration_minutes * 60 * 1000;
  const countdown = splitCountdown(Math.max(0, diff));

  const Pill = ({ value, label, glow }: { value: number; label: string; glow?: boolean }) => (
    <div className="flex flex-col items-center">
      <div
        className={`min-w-[48px] text-center rounded-lg px-2.5 py-2 font-mono text-xl font-bold tracking-wider text-white bg-white/[0.06] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${glow ? "ring-1 ring-white/[0.08]" : ""}`}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mt-1.5">
        {label}
      </span>
    </div>
  );

  const ColonSep = () => (
    <span className="text-white/30 font-mono text-xl font-bold animate-pulse mb-4">:</span>
  );

  return (
    <div className="vault-luxury-card p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <Video className="h-5 w-5 text-primary" />
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary/80">
          Next Group Call
        </span>
        {isLive && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold uppercase text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Now
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold text-white mb-4">{session.title}</h3>

      {!isLive && diff > 0 && (
        <div className="flex flex-col items-center gap-2 mb-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Starts In</span>
          <div className="flex items-center gap-2">
            {countdown.d > 0 && <><Pill value={countdown.d} label="Days" /><ColonSep /></>}
            <Pill value={countdown.h} label="Hrs" />
            <ColonSep />
            <Pill value={countdown.m} label="Min" />
            <ColonSep />
            <Pill value={countdown.s} label="Sec" glow />
          </div>
        </div>
      )}

      <button
        onClick={() => navigate("/academy/live")}
        className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-[0.97]"
      >
        {isLive ? "Join Now" : "View Calls"} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
