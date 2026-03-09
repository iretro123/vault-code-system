import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface SessionTimerProps {
  sessionDate: string;
  durationMinutes: number;
}

function splitCountdown(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { d, h, m, s };
}

const Sep = ({ className = "text-blue-400/40" }: { className?: string }) => (
  <span className={`${className} mx-0.5`}>:</span>
);

const Digit = ({ value, label, color = "text-blue-400" }: { value: number; label: string; color?: string }) => (
  <span className="inline-flex items-baseline gap-px">
    <span className={`${color} font-mono font-semibold tracking-widest`}>
      {String(value).padStart(2, "0")}
    </span>
    <span className={`${color}/50 text-[10px] font-medium`}>{label}</span>
  </span>
);

export function SessionTimer({ sessionDate, durationMinutes }: SessionTimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(sessionDate).getTime();
  const end = start + durationMinutes * 60 * 1000;

  // Session ended — show muted label for 5 min grace period, then hide
  if (now >= end) {
    const gracePeriod = 5 * 60 * 1000;
    if (now < end + gracePeriod) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03]">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/30">
            Session Ended
          </span>
        </div>
      );
    }
    return null;
  }

  // Session is LIVE — show elapsed + "ends in" countdown
  if (now >= start) {
    const remaining = splitCountdown(end - now);
    return (
      <div className="inline-flex items-center gap-3">
        {/* LIVE badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5">
          <span className="flex items-center gap-1.5 text-red-400 text-[11px] font-bold uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live
          </span>
        </div>

        {/* Ends in countdown — premium red pill */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-red-500/15"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)",
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/60">
            Ends in
          </span>
          <span className="inline-flex items-baseline text-sm">
            {(remaining.d > 0 || remaining.h > 0) && (
              <>
                <Digit value={remaining.h} label="h" color="text-red-400" />
                <Sep className="text-red-400/30" />
              </>
            )}
            <Digit value={remaining.m} label="m" color="text-red-400" />
            <Sep className="text-red-400/30" />
            <Digit value={remaining.s} label="s" color="text-red-400" />
          </span>
        </div>
      </div>
    );
  }

  // Pre-session — blue countdown
  const { d, h, m, s } = splitCountdown(start - now);
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5">
      <Clock className="w-3.5 h-3.5 text-blue-400/60" />
      <span className="inline-flex items-baseline text-sm">
        {d > 0 && <><Digit value={d} label="d" /><Sep /></>}
        {(d > 0 || h > 0) && <><Digit value={h} label="h" /><Sep /></>}
        <Digit value={m} label="m" />
        <Sep />
        <Digit value={s} label="s" />
      </span>
    </div>
  );
}
