import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { loadTimes } from "@/components/trade-os/SessionSetupCard";

// NYSE market hours in minutes from midnight (ET)
const MARKET_OPEN = 9 * 60 + 30;  // 9:30 AM
const MARKET_CLOSE = 16 * 60;     // 4:00 PM
const MARKET_SPAN = MARKET_CLOSE - MARKET_OPEN; // 390 minutes

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToPercent(minutes: number): number {
  return Math.max(0, Math.min(100, ((minutes - MARKET_OPEN) / MARKET_SPAN) * 100));
}

function fmt12h(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function getNowMinutesET(): number {
  // Approximate ET: get UTC and subtract 4 or 5 hours
  // We use America/New_York if available, else fallback
  try {
    const etStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit" });
    const [h, m] = etStr.split(":").map(Number);
    return h * 60 + m;
  } catch {
    // Fallback: assume ET = UTC - 4
    const now = new Date();
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    return ((utcH - 4 + 24) % 24) * 60 + utcM;
  }
}

export function NYSESessionBar({ className }: { className?: string }) {
  const [nowMin, setNowMin] = useState(getNowMinutesET);

  useEffect(() => {
    const id = setInterval(() => setNowMin(getNowMinutesET()), 1000);
    return () => clearInterval(id);
  }, []);

  const times = loadTimes();

  const zones = useMemo(() => {
    if (!times) return null;
    const start = timeToMinutes(times.start);
    const cutoff = timeToMinutes(times.cutoff);
    const hardClose = timeToMinutes(times.hardClose);
    return {
      startPct: minutesToPercent(start),
      cutoffPct: minutesToPercent(cutoff),
      closePct: minutesToPercent(hardClose),
      startMin: start,
      cutoffMin: cutoff,
      closeMin: hardClose,
    };
  }, [times]);

  const nowPct = minutesToPercent(nowMin);
  const isMarketHours = nowMin >= MARKET_OPEN && nowMin <= MARKET_CLOSE;

  // Determine current phase for marker color
  const markerColor = useMemo(() => {
    if (!zones) return "bg-primary";
    if (nowMin < zones.startMin) return "bg-muted-foreground";
    if (nowMin < zones.cutoffMin) return "bg-emerald-400";
    if (nowMin < zones.closeMin) return "bg-amber-400";
    return "bg-red-400";
  }, [zones, nowMin]);

  return (
    <div className={cn("rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2", className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-semibold text-muted-foreground/50 uppercase tracking-wider">NYSE Session</span>
        <span className="text-[9px] font-medium text-muted-foreground/40 tabular-nums">
          {fmt12h(MARKET_OPEN)} – {fmt12h(MARKET_CLOSE)} ET
        </span>
      </div>

      {/* Bar container */}
      <div className="relative h-3 rounded-full bg-white/[0.04] overflow-hidden">
        {/* User active zone (start → cutoff): primary glow */}
        {zones && (
          <>
            <div
              className="absolute inset-y-0 rounded-full bg-primary/20"
              style={{
                left: `${zones.startPct}%`,
                width: `${zones.cutoffPct - zones.startPct}%`,
                boxShadow: "0 0 12px hsla(var(--primary), 0.25)",
              }}
            />
            {/* Cutoff → hard close: amber zone */}
            <div
              className="absolute inset-y-0 rounded-full bg-amber-500/10 border-l border-amber-500/20"
              style={{
                left: `${zones.cutoffPct}%`,
                width: `${zones.closePct - zones.cutoffPct}%`,
              }}
            />
            {/* Hard close → market close: locked zone */}
            <div
              className="absolute inset-y-0 rounded-full bg-red-500/[0.06]"
              style={{
                left: `${zones.closePct}%`,
                width: `${100 - zones.closePct}%`,
              }}
            />
          </>
        )}

        {/* Animated now-marker */}
        {isMarketHours && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full transition-[left] duration-1000 ease-linear",
              markerColor
            )}
            style={{
              left: `${nowPct}%`,
              boxShadow: `0 0 8px currentColor, 0 0 16px currentColor`,
            }}
          />
        )}
      </div>

      {/* Time labels */}
      <div className="relative h-3">
        {/* Market open */}
        <span className="absolute left-0 text-[7px] text-muted-foreground/30 tabular-nums font-medium">9:30</span>

        {/* User session markers */}
        {zones && (
          <>
            <span
              className="absolute text-[7px] text-primary/60 tabular-nums font-semibold -translate-x-1/2"
              style={{ left: `${zones.startPct}%` }}
            >
              {fmt12h(zones.startMin)}
            </span>
            <span
              className="absolute text-[7px] text-amber-400/60 tabular-nums font-semibold -translate-x-1/2"
              style={{ left: `${zones.cutoffPct}%` }}
            >
              {fmt12h(zones.cutoffMin)}
            </span>
            <span
              className="absolute text-[7px] text-red-400/50 tabular-nums font-semibold -translate-x-1/2"
              style={{ left: `${zones.closePct}%` }}
            >
              {fmt12h(zones.closeMin)}
            </span>
          </>
        )}

        {/* Market close */}
        <span className="absolute right-0 text-[7px] text-muted-foreground/30 tabular-nums font-medium">4:00</span>
      </div>

      {/* No session set fallback */}
      {!zones && (
        <p className="text-[9px] text-muted-foreground/30 text-center italic">Set your session window to see your active zone</p>
      )}
    </div>
  );
}
