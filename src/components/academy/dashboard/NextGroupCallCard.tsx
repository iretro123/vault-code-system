import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Video, ArrowRight } from "lucide-react";
import { formatTimeInTZ, getTZAbbr, getUserTimezone } from "@/lib/userTime";

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

type UrgencyTier = "calm" | "attention" | "urgent" | "live";

function getUrgencyTier(diffMs: number, isLive: boolean): UrgencyTier {
  if (isLive) return "live";
  if (diffMs <= 15 * 60 * 1000) return "urgent";
  if (diffMs <= 60 * 60 * 1000) return "attention";
  return "calm";
}

const urgencyStyles: Record<UrgencyTier, { text: string; border: string; glow: string; bg: string; label: string; sep: string }> = {
  calm: {
    text: "text-blue-400",
    border: "border-blue-500/15",
    glow: "shadow-[0_4px_20px_-4px_rgba(59,130,246,0.25)]",
    bg: "bg-blue-500/[0.06]",
    label: "text-blue-400/50",
    sep: "text-blue-400/30",
  },
  attention: {
    text: "text-amber-400",
    border: "border-amber-500/20",
    glow: "shadow-[0_4px_20px_-4px_rgba(251,191,36,0.3)]",
    bg: "bg-amber-500/[0.06]",
    label: "text-amber-400/50",
    sep: "text-amber-400/30",
  },
  urgent: {
    text: "text-red-400",
    border: "border-red-500/25",
    glow: "shadow-[0_4px_24px_-4px_rgba(239,68,68,0.35)]",
    bg: "bg-red-500/[0.06]",
    label: "text-red-400/50",
    sep: "text-red-400/30",
  },
  live: {
    text: "text-red-400",
    border: "border-red-500/30",
    glow: "shadow-[0_4px_24px_-4px_rgba(239,68,68,0.4)]",
    bg: "bg-red-500/[0.08]",
    label: "text-red-400/50",
    sep: "text-red-400/30",
  },
};

export function NextGroupCallCard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userTZ = getUserTimezone(profile?.timezone);
  const tzLabel = getTZAbbr(userTZ);
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
  const tier = getUrgencyTier(diff, isLive);
  const s = urgencyStyles[tier];
  const isUrgentPulse = tier === "urgent";
  const isCritical = diff > 0 && diff <= 5 * 60 * 1000;

  const Pill = ({ value, label, isSeconds }: { value: number; label: string; isSeconds?: boolean }) => (
    <div className="flex flex-col items-center">
      <div
        className={`min-w-[56px] text-center rounded-xl px-3 py-3 font-mono text-2xl font-bold tracking-wider text-white ${s.bg} ${s.border} border ${s.glow} transition-all duration-300 ${isSeconds && isUrgentPulse ? "animate-pulse" : ""}`}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-widest mt-1.5 ${s.label}`}>
        {label}
      </span>
    </div>
  );

  const ColonSep = () => (
    <span className={`${s.sep} font-mono text-2xl font-bold mb-5 transition-colors duration-300`}>:</span>
  );

  return (
    <div className={`vault-luxury-card p-6 flex flex-col transition-all duration-300 ${isCritical ? `ring-1 ${s.border}` : ""}`}>
      <div className="flex items-center gap-3 mb-2">
        <Video className={`h-5 w-5 ${isLive ? "text-red-400" : "text-primary"}`} />
        <span className={`text-xs font-bold uppercase tracking-[0.12em] ${isLive ? "text-red-400/80" : "text-primary/80"}`}>
          Next Group Call
        </span>
        {isLive && (
          <span className="ml-auto flex items-center gap-2 text-xs font-bold uppercase text-red-400">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            Live Now
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold text-white mb-1">{session.title}</h3>
      <p className="text-xs text-muted-foreground mb-5">{formatTimeInTZ(session.session_date, userTZ)} {tzLabel}</p>

      {!isLive && diff > 0 && (
        <div className="flex flex-col items-center gap-3 mb-5">
          <span className={`text-xs font-bold uppercase tracking-[0.2em] ${s.label} transition-colors duration-300`}>Starts In</span>
          <div className="flex items-center gap-2.5">
            {countdown.d > 0 && <><Pill value={countdown.d} label="Days" /><ColonSep /></>}
            <Pill value={countdown.h} label="Hrs" />
            <ColonSep />
            <Pill value={countdown.m} label="Min" />
            <ColonSep />
            <Pill value={countdown.s} label="Sec" isSeconds />
          </div>
        </div>
      )}

      <button
        onClick={() => navigate("/academy/live")}
        className={`mt-auto w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.97] ${
          isLive
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {isLive ? "Join Now" : "View Calls"} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
