import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { loadTimes } from "@/components/trade-os/SessionSetupCard";

const MARKET_OPEN = 9 * 60 + 30;
const MARKET_CLOSE = 16 * 60;
const MARKET_SPAN = MARKET_CLOSE - MARKET_OPEN;

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
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")}`;
}

function getNowMinutesET(): number {
  try {
    const etStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit" });
    const [h, m] = etStr.split(":").map(Number);
    return h * 60 + m;
  } catch {
    const now = new Date();
    return ((now.getUTCHours() - 4 + 24) % 24) * 60 + now.getUTCMinutes();
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

  const markerColor = useMemo(() => {
    if (!zones) return "text-primary";
    if (nowMin < zones.startMin) return "text-muted-foreground";
    if (nowMin < zones.cutoffMin) return "text-emerald-400";
    if (nowMin < zones.closeMin) return "text-amber-400";
    return "text-red-400";
  }, [zones, nowMin]);

  const phaseLabel = useMemo(() => {
    if (!zones) return null;
    if (nowMin < zones.startMin) return "Pre-session";
    if (nowMin < zones.cutoffMin) return "Active Window";
    if (nowMin < zones.closeMin) return "No New Entries";
    return "Session Closed";
  }, [zones, nowMin]);

  return (
    <div className={cn("vault-obsidian-surface p-4 md:p-3 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em]">NYSE Session</span>
          {phaseLabel && isMarketHours && (
            <span className={cn(
              "text-[9px] font-semibold px-2 py-0.5 rounded-full",
              nowMin < (zones?.cutoffMin ?? 0)
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : nowMin < (zones?.closeMin ?? 0)
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              {phaseLabel}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium text-muted-foreground/30 tabular-nums">
          9:30 AM – 4:00 PM ET
        </span>
      </div>

      {/* Track */}
      <div className="relative h-7 rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, hsla(0,0%,100%,0.035) 0%, hsla(0,0%,100%,0.015) 100%)",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3), inset 0 -1px 0 hsla(0,0%,100%,0.02)",
          border: "1px solid hsla(0,0%,100%,0.04)",
        }}
      >
        {zones && (
          <>
            {/* Active zone: start → cutoff */}
            <div
              className="absolute inset-y-0 rounded-xl"
              style={{
                left: `${zones.startPct}%`,
                width: `${Math.max(0, zones.cutoffPct - zones.startPct)}%`,
                background: "linear-gradient(180deg, hsla(160,84%,39%,0.18) 0%, hsla(217,91%,60%,0.12) 50%, hsla(217,91%,60%,0.08) 100%)",
                boxShadow: "0 0 20px hsla(160,84%,39%,0.1), inset 0 1px 0 hsla(0,0%,100%,0.06)",
              }}
            />

            {/* Amber zone: cutoff → hard close */}
            <div
              className="absolute inset-y-0"
              style={{
                left: `${zones.cutoffPct}%`,
                width: `${Math.max(0, zones.closePct - zones.cutoffPct)}%`,
                background: "linear-gradient(180deg, hsla(38,92%,50%,0.12) 0%, hsla(38,92%,50%,0.06) 100%)",
                borderLeft: "1px solid hsla(38,92%,50%,0.2)",
              }}
            />

            {/* Locked zone: hard close → market close */}
            <div
              className="absolute inset-y-0"
              style={{
                left: `${zones.closePct}%`,
                width: `${Math.max(0, 100 - zones.closePct)}%`,
                background: "linear-gradient(180deg, hsla(0,72%,51%,0.08) 0%, hsla(0,72%,51%,0.03) 100%)",
                borderLeft: "1px solid hsla(0,72%,51%,0.15)",
              }}
            />

            {/* Zone boundary ticks */}
            {[zones.startPct, zones.cutoffPct, zones.closePct].map((pct, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px"
                style={{
                  left: `${pct}%`,
                  background: i === 0
                    ? "hsla(160,84%,39%,0.25)"
                    : i === 1
                      ? "hsla(38,92%,50%,0.25)"
                      : "hsla(0,72%,51%,0.2)",
                }}
              />
            ))}
          </>
        )}

        {/* Now marker */}
        {isMarketHours && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-[left] duration-1000 ease-linear z-10",
              markerColor
            )}
            style={{ left: `${nowPct}%` }}
          >
            {/* Outer ring */}
            <div className="w-5 h-5 rounded-full border-2 border-current vault-now-marker flex items-center justify-center"
              style={{ background: "hsla(214,26%,8%,0.6)" }}
            >
              {/* Inner dot */}
              <div className="w-2 h-2 rounded-full bg-current" />
            </div>
          </div>
        )}
      </div>

      {/* Time labels */}
      <div className="relative h-4">
        <span className="absolute left-0 text-[9px] text-muted-foreground/25 tabular-nums font-medium">9:30</span>

        {zones && (
          <>
            <span
              className="absolute text-[9px] text-emerald-400/50 tabular-nums font-semibold -translate-x-1/2"
              style={{ left: `${zones.startPct}%` }}
            >
              {fmt12h(zones.startMin)}
            </span>
            <span
              className="absolute text-[9px] text-amber-400/50 tabular-nums font-semibold -translate-x-1/2"
              style={{ left: `${zones.cutoffPct}%` }}
            >
              {fmt12h(zones.cutoffMin)}
            </span>
            <span
              className="absolute text-[9px] text-red-400/40 tabular-nums font-semibold -translate-x-1/2"
              style={{ left: `${zones.closePct}%` }}
            >
              {fmt12h(zones.closeMin)}
            </span>
          </>
        )}

        <span className="absolute right-0 text-[9px] text-muted-foreground/25 tabular-nums font-medium">4:00</span>
      </div>

      {/* No session fallback */}
      {!zones && (
        <p className="text-[10px] text-muted-foreground/25 text-center">Set your session window to see your active zone</p>
      )}
    </div>
  );
}
