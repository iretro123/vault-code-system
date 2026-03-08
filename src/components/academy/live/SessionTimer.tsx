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

function splitElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s };
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

  if (now >= end) return null;

  if (now >= start) {
    const { h, m, s } = splitElapsed(now - start);
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5">
        <span className="flex items-center gap-1.5 text-red-400 text-[11px] font-bold uppercase tracking-wide">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live
        </span>
        <span className="inline-flex items-baseline text-sm">
          <Digit value={h} label="h" color="text-red-400" />
          <Sep className="text-red-400/40" />
          <Digit value={m} label="m" color="text-red-400" />
          <Sep className="text-red-400/40" />
          <Digit value={s} label="s" color="text-red-400" />
        </span>
      </div>
    );
  }

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
