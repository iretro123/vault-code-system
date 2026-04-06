import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useEconomicCalendar, type MarketEvent } from "@/hooks/useEconomicCalendar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import { etTimeToUTCDate, formatTimeInTZ, getTZAbbr, getUserTimezone } from "@/lib/userTime";

interface Props {
  active: boolean;
}

/* ── helpers ── */

/** Format an ET time string "08:30" into the user's local timezone */
function formatEventTime(t: string | null, eventDate: string, userTZ: string): string {
  if (!t) return "—";
  const utcDate = etTimeToUTCDate(eventDate, t);
  return formatTimeInTZ(utcDate, userTZ);
}

function impactColor(impact: string) {
  if (impact === "high") return "bg-red-500";
  if (impact === "medium") return "bg-amber-400";
  return "bg-muted-foreground/30";
}

function formatNum(v: number | null, unit?: string | null) {
  if (v === null || v === undefined) return "—";
  const str = v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (unit === "%") return `${str}%`;
  if (unit === "billion") return `$${str}B`;
  if (unit === "million") return `$${str}M`;
  if (unit === "thousand") return `${str}K`;
  return str;
}

function dayLabel(dateStr: string) {
  try {
    return format(parseISO(dateStr), "EEEE, MMM d");
  } catch {
    return dateStr;
  }
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

/** Parse "08:30" or "10:00" into minutes-since-midnight in ET */
function parseTimeET(t: string | null): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Get the current ET minutes-since-midnight (approximation using America/New_York) */
function nowMinutesET(): number {
  const now = new Date();
  const etStr = now.toLocaleString("en-US", { timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit" });
  const [h, m] = etStr.split(":").map(Number);
  return h * 60 + m;
}

/** Get a Date object for today at a given ET time string like "08:30" */
function todayETDate(timeET: string): Date {
  const [h, m] = timeET.split(":").map(Number);
  const now = new Date();
  const etDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  // Use Intl to find the real ET offset right now
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-4";
  const offsetMatch = tzPart.match(/GMT([+-]\d+)/);
  const etOffsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : -4;
  // Build UTC timestamp for the target ET time, then adjust for ET offset
  const targetUTC = new Date(`${etDateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`);
  return new Date(targetUTC.getTime() - etOffsetHours * 60 * 60 * 1000);
}

/* ── countdown components (matching NextGroupCallCard style) ── */

function splitCountdown(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s };
}

function Pill({ value, label, glow }: { value: number; label: string; glow?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "min-w-[48px] text-center rounded-lg px-2.5 py-2 font-mono text-xl font-bold tracking-wider text-white",
          "bg-white/[0.06] border border-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
          glow && "ring-1 ring-white/[0.08]"
        )}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mt-1.5">
        {label}
      </span>
    </div>
  );
}

function ColonSep() {
  return <span className="text-white/30 font-mono text-xl font-bold mb-4">:</span>;
}

/* ── Next Up Hero Card ── */

function NextUpCard({ events, userTZ }: { events: MarketEvent[]; userTZ: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = todayStr();
  const currentMinutesET = nowMinutesET();

  // Find next upcoming event TODAY that hasn't passed
  const todayEvents = events
    .filter((e) => e.date === today && e.time_et)
    .sort((a, b) => (parseTimeET(a.time_et) || 0) - (parseTimeET(b.time_et) || 0));

  const nextEvent = todayEvents.find((e) => {
    const mins = parseTimeET(e.time_et);
    return mins !== null && mins > currentMinutesET;
  });

  if (!nextEvent || !nextEvent.time_et) return null;

  const targetDate = todayETDate(nextEvent.time_et);
  const diff = targetDate.getTime() - now;

  if (diff <= 0) return null;

  const countdown = splitCountdown(diff);
  const isHigh = nextEvent.impact === "high";
  const tzLabel = getTZAbbr(userTZ);

  const countdown = splitCountdown(diff);
  const isHigh = nextEvent.impact === "high";

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-6 mb-5 backdrop-blur-sm overflow-hidden",
        "bg-white/[0.03] border-white/[0.06]",
        isHigh && "shadow-[0_0_40px_rgba(239,68,68,0.08)] border-red-500/10"
      )}
    >
      {/* Subtle top gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="flex items-center gap-2 mb-1.5">
        <Clock className="w-3.5 h-3.5 text-primary/60" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
          Next Up Today
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground truncate">
            {nextEvent.event_name}
          </h3>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {formatEventTime(nextEvent.time_et, nextEvent.date, userTZ)} {tzLabel}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                isHigh
                  ? "bg-red-500/10 text-red-400"
                  : nextEvent.impact === "medium"
                  ? "bg-amber-400/10 text-amber-400"
                  : "bg-white/[0.05] text-muted-foreground/60"
              )}
            >
              {nextEvent.impact}
            </span>
          </div>
        </div>

        {/* Countdown pills */}
        <div className="flex items-center gap-2">
          <Pill value={countdown.h} label="Hrs" />
          <ColonSep />
          <Pill value={countdown.m} label="Min" />
          <ColonSep />
          <Pill value={countdown.s} label="Sec" glow />
        </div>
      </div>
    </div>
  );
}

/* ── skeleton ── */

function CalendarSkeleton() {
  return (
    <div className="px-4 py-5 space-y-5">
      <Skeleton className="h-7 w-56 rounded-lg" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/* ── main component ── */

export function EconomicCalendarTab({ active }: Props) {
  const { isLoading, allEvents } = useEconomicCalendar();

  if (!active) return null;
  if (isLoading) return <CalendarSkeleton />;

  const today = todayStr();

  // Group by date
  const grouped: Record<string, MarketEvent[]> = {};
  allEvents.forEach((e) => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });
  const dates = Object.keys(grouped).sort();

  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 py-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-foreground">U.S. Economic Calendar</h2>
      </div>

      {/* Next Up countdown hero */}
      <NextUpCard events={allEvents} />

      {dates.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No events scheduled.</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Check back when new data is available.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map((date) => {
            const isToday = date === today;
            return (
              <section key={date}>
                <p
                  className={cn(
                    "text-[10px] uppercase tracking-[0.15em] font-semibold mb-2.5 sticky top-0 backdrop-blur-sm py-1.5 z-10",
                    isToday
                      ? "text-primary font-bold bg-primary/[0.04]"
                      : "text-muted-foreground/60 bg-background/90"
                  )}
                >
                  {isToday && "⦿ TODAY — "}
                  {dayLabel(date)}
                </p>
                <div className="space-y-1.5">
                  {grouped[date].map((e) => {
                    const isHigh = e.impact === "high";
                    return (
                      <div
                        key={e.id}
                        className={cn(
                          "flex items-stretch rounded-xl overflow-hidden border border-white/[0.04] bg-white/[0.02]",
                          isHigh && "shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                        )}
                      >
                        <div className={cn("w-1 shrink-0", impactColor(e.impact))} />
                        <div className="flex-1 px-4 py-3 flex items-center gap-3">
                          <div className="w-14 shrink-0">
                            <p className="text-xs font-mono font-semibold text-foreground">{formatTimeET(e.time_et)}</p>
                            <p className="text-[9px] text-muted-foreground/50">ET</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{e.event_name}</p>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
                              isHigh
                                ? "bg-red-500/10 text-red-400"
                                : e.impact === "medium"
                                ? "bg-amber-400/10 text-amber-400"
                                : "bg-white/[0.05] text-muted-foreground/60"
                            )}
                          >
                            {e.impact}
                          </span>
                          <div className="hidden sm:grid grid-cols-3 gap-4 shrink-0 w-44">
                            <div className="text-center">
                              <p className="text-[9px] uppercase text-muted-foreground/50">Prev</p>
                              <p className="text-xs font-mono font-semibold text-foreground">{formatNum(e.prev, e.unit)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] uppercase text-muted-foreground/50">Est</p>
                              <p className="text-xs font-mono font-semibold text-foreground">{formatNum(e.estimate, e.unit)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] uppercase text-muted-foreground/50">Act</p>
                              <p className="text-xs font-mono font-semibold text-foreground">{formatNum(e.actual, e.unit)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
