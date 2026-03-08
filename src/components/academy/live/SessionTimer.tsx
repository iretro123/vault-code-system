import { useState, useEffect } from "react";

interface SessionTimerProps {
  sessionDate: string;
  durationMinutes: number;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${String(m).padStart(2, "0")}m`);
  parts.push(`${String(s).padStart(2, "0")}s`);
  return parts.join(" ");
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
    // LIVE
    const elapsed = now - start;
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="flex items-center gap-1.5 bg-destructive/20 text-destructive px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          Live
        </span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatElapsed(elapsed)}
        </span>
      </div>
    );
  }

  // Countdown
  const diff = start - now;
  return (
    <p className="text-sm text-muted-foreground mt-2">
      ⏳ Starts in{" "}
      <span className="font-mono font-semibold text-foreground">
        {formatCountdown(diff)}
      </span>
    </p>
  );
}
