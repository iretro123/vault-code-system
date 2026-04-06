import { useState, useEffect } from "react";
import { CalendarDays, TrendingUp, RefreshCw, Zap, Clock, BarChart3, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEconomicCalendar, EconomicEvent, EarningsEvent } from "@/hooks/useEconomicCalendar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isToday, startOfWeek, addDays, differenceInMinutes, differenceInHours } from "date-fns";

/* ── types ───────────────────────────────────────────── */

type FilterMode = "all" | "high" | "earnings";

/* ── helpers ─────────────────────────────────────────── */

function impactLabel(impact: string) {
  if (impact === "high") return "High Impact";
  if (impact === "medium") return "Medium";
  return "Low";
}

function formatVal(v: number | null, unit: string) {
  if (v === null || v === undefined) return "—";
  return `${v}${unit === "%" ? "%" : ""}`;
}

function groupByDate(events: EconomicEvent[]) {
  const map: Record<string, EconomicEvent[]> = {};
  events.forEach((e) => {
    if (!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  });
  return map;
}

function weekDayPills(eventCounts: Record<string, number>) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 5 }, (_, i) => {
    const d = addDays(start, i);
    const dateStr = format(d, "yyyy-MM-dd");
    return {
      date: dateStr,
      label: format(d, "EEE"),
      dayNum: format(d, "d"),
      isToday: isToday(d),
      count: eventCounts[dateStr] || 0,
    };
  });
}

function getCountdown(time: string | null, dateStr: string): string | null {
  if (!time) return null;
  try {
    const [h, m] = time.split(":").map(Number);
    const eventDate = parseISO(dateStr);
    eventDate.setHours(h, m, 0, 0);
    const now = new Date();
    const diffMin = differenceInMinutes(eventDate, now);
    if (diffMin < 0) return null;
    if (diffMin < 60) return `Drops in ${diffMin}m`;
    const hrs = differenceInHours(eventDate, now);
    const remainMin = diffMin - hrs * 60;
    return `Drops in ${hrs}h ${remainMin}m`;
  } catch {
    return null;
  }
}

function timeSinceUpdate(ts: number): string {
  if (!ts) return "";
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

/* ── sub-components ──────────────────────────────────── */

function MarketPulseStrip({ highCount, earningsCount, lastUpdated, onRefresh, isFetching }: {
  highCount: number; earningsCount: number; lastUpdated: number; onRefresh: () => void; isFetching: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Market Pulse</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {highCount > 0 && <><span className="text-red-400 font-semibold">{highCount}</span> high-impact events</>}
          {highCount > 0 && earningsCount > 0 && " · "}
          {earningsCount > 0 && <><span className="text-foreground font-semibold">{earningsCount}</span> earnings reports</>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {lastUpdated > 0 && (
          <span className="text-[10px] text-muted-foreground/60">{timeSinceUpdate(lastUpdated)}</span>
        )}
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isFetching && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}

function FilterPills({ active, onChange }: { active: FilterMode; onChange: (f: FilterMode) => void }) {
  const pills: { key: FilterMode; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All", icon: BarChart3 },
    { key: "high", label: "High Impact", icon: Zap },
    { key: "earnings", label: "Earnings", icon: TrendingUp },
  ];
  return (
    <div className="flex items-center gap-1.5 px-5 py-3">
      {pills.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all",
            active === p.key
              ? "bg-primary/15 text-primary border border-primary/20"
              : "bg-white/[0.03] text-muted-foreground border border-white/[0.04] hover:bg-white/[0.06]"
          )}
        >
          <p.icon className="w-3 h-3" />
          {p.label}
        </button>
      ))}
    </div>
  );
}

function HeroEventCard({ event }: { event: EconomicEvent }) {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setCountdown(getCountdown(event.time, event.date));
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [event.time, event.date]);

  const isHigh = event.impact === "high";

  return (
    <div className={cn(
      "mx-5 mb-4 rounded-2xl border p-5 relative overflow-hidden",
      isHigh
        ? "border-red-500/20 bg-red-500/[0.03]"
        : "border-amber-400/20 bg-amber-400/[0.03]"
    )}>
      {/* Glow effect */}
      <div className={cn(
        "absolute inset-0 opacity-20 pointer-events-none",
        isHigh
          ? "bg-gradient-to-br from-red-500/10 via-transparent to-transparent"
          : "bg-gradient-to-br from-amber-400/10 via-transparent to-transparent"
      )} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Zap className={cn("w-4 h-4", isHigh ? "text-red-400" : "text-amber-400")} />
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md",
              isHigh ? "bg-red-500/15 text-red-400" : "bg-amber-400/15 text-amber-400"
            )}>
              {impactLabel(event.impact)}
            </span>
            {event.time && (
              <span className="text-[11px] text-muted-foreground font-mono">{event.time} ET</span>
            )}
          </div>
          <h3 className="text-[16px] font-bold text-foreground leading-tight mb-1">{event.event}</h3>
          {countdown && (
            <div className="flex items-center gap-1.5 mt-2">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-[12px] font-semibold text-primary">{countdown}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <DataCol label="Prev" value={formatVal(event.prev, event.unit)} />
          <DataCol label="Est" value={formatVal(event.estimate, event.unit)} />
          <DataCol label="Act" value={formatVal(event.actual, event.unit)} highlight={event.actual !== null} />
        </div>
      </div>
    </div>
  );
}

function DataCol({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center min-w-[48px]">
      <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className={cn(
        "text-[15px] font-mono font-bold leading-none",
        highlight ? "text-primary" : "text-foreground/80"
      )}>{value}</p>
    </div>
  );
}

function WeekPills({ days, selectedDay, onSelect }: {
  days: ReturnType<typeof weekDayPills>; selectedDay: string | null; onSelect: (d: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-5 py-3">
      {days.map((day) => (
        <button
          key={day.date}
          onClick={() => onSelect(selectedDay === day.date ? null : day.date)}
          className={cn(
            "flex flex-col items-center gap-1 min-w-[52px] px-3 py-2.5 rounded-2xl transition-all relative",
            selectedDay === day.date
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : day.isToday
              ? "bg-primary/10 text-primary border border-primary/15"
              : "bg-white/[0.03] text-muted-foreground border border-white/[0.04] hover:bg-white/[0.06]"
          )}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider">{day.label}</span>
          <span className="text-[16px] font-bold leading-none">{day.dayNum}</span>
          {day.count > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center",
              selectedDay === day.date
                ? "bg-primary-foreground text-primary"
                : "bg-primary text-primary-foreground"
            )}>
              {day.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-6 pb-3">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[12px] font-bold uppercase tracking-widest text-foreground">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

function EventCard({ event }: { event: EconomicEvent }) {
  const isHigh = event.impact === "high";
  const isMedium = event.impact === "medium";

  return (
    <div className={cn(
      "flex items-stretch gap-0 mx-5 mb-2 rounded-2xl border overflow-hidden transition-colors",
      isHigh ? "border-red-500/10 bg-red-500/[0.02] hover:border-red-500/20" :
      isMedium ? "border-amber-400/10 bg-amber-400/[0.02] hover:border-amber-400/15" :
      "border-white/[0.04] bg-card/60 hover:border-white/[0.08]"
    )}>
      {/* Impact bar */}
      <div className={cn(
        "w-1 shrink-0",
        isHigh ? "bg-red-500" : isMedium ? "bg-amber-400" : "bg-muted-foreground/30"
      )} />

      <div className="flex-1 flex items-center justify-between px-4 py-3.5 min-w-0">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Time */}
          {event.time && (
            <span className="text-[13px] font-mono font-semibold text-muted-foreground shrink-0 min-w-[52px]">
              {event.time}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{event.event}</p>
            <span className={cn(
              "inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md",
              isHigh ? "bg-red-500/10 text-red-400" :
              isMedium ? "bg-amber-400/10 text-amber-400" :
              "bg-white/[0.04] text-muted-foreground"
            )}>
              {impactLabel(event.impact)}
            </span>
          </div>
        </div>

        {/* Data columns */}
        <div className="flex items-center gap-1 shrink-0 pl-4">
          <div className="flex items-center gap-4 px-3 py-1.5 rounded-xl bg-white/[0.02]">
            <DataCol label="Prev" value={formatVal(event.prev, event.unit)} />
            <div className="w-px h-6 bg-white/[0.06]" />
            <DataCol label="Est" value={formatVal(event.estimate, event.unit)} />
            <div className="w-px h-6 bg-white/[0.06]" />
            <DataCol label="Act" value={formatVal(event.actual, event.unit)} highlight={event.actual !== null} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DateDivider({ dateStr }: { dateStr: string }) {
  const d = parseISO(dateStr);
  const label = isToday(d) ? "Today" : format(d, "EEEE, MMM d");
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-2.5 bg-background/95 backdrop-blur-sm">
      <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
      <span className="text-[11px] font-bold text-foreground tracking-wide">{label}</span>
      {isToday(d) && (
        <span className="ml-auto text-[10px] text-muted-foreground">{format(new Date(), "MMMM d, yyyy")}</span>
      )}
    </div>
  );
}

function EarningCard({ earning }: { earning: EarningsEvent }) {
  const hasBeat = earning.epsActual !== null && earning.epsEstimate !== null && earning.epsActual > earning.epsEstimate;
  const hasMiss = earning.epsActual !== null && earning.epsEstimate !== null && earning.epsActual < earning.epsEstimate;

  return (
    <div className={cn(
      "flex items-center justify-between mx-5 mb-2 px-4 py-3.5 rounded-2xl border transition-colors",
      hasBeat ? "border-emerald-500/10 bg-emerald-500/[0.02]" :
      hasMiss ? "border-red-500/10 bg-red-500/[0.02]" :
      "border-white/[0.04] bg-card/60 hover:border-white/[0.08]"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {/* Ticker */}
        <span className="text-[14px] font-mono font-black text-foreground bg-white/[0.05] px-2.5 py-1 rounded-lg tracking-wider min-w-[56px] text-center">
          {earning.symbol}
        </span>
        <div className="flex flex-col gap-0.5">
          {/* Timing badge */}
          <span className={cn(
            "inline-flex w-fit text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md",
            earning.hour === "Before Open" || earning.hour === "bmo"
              ? "bg-amber-400/10 text-amber-400"
              : earning.hour === "After Close" || earning.hour === "amc"
              ? "bg-blue-400/10 text-blue-400"
              : "bg-white/[0.04] text-muted-foreground"
          )}>
            {earning.hour === "Before Open" || earning.hour === "bmo" ? "BMO" :
             earning.hour === "After Close" || earning.hour === "amc" ? "AMC" :
             earning.hour || "TBD"}
          </span>
          {/* Date */}
          <span className="text-[10px] text-muted-foreground/60 font-medium">
            {format(parseISO(earning.date), "MMM d")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="flex items-center gap-4 px-3 py-1.5 rounded-xl bg-white/[0.02]">
          <DataCol label="EPS Est" value={earning.epsEstimate !== null ? `$${earning.epsEstimate}` : "—"} />
          <div className="w-px h-6 bg-white/[0.06]" />
          <DataCol
            label="EPS Act"
            value={earning.epsActual !== null ? `$${earning.epsActual}` : "—"}
            highlight={earning.epsActual !== null}
          />
          {earning.revenueEstimate !== null && (
            <>
              <div className="w-px h-6 bg-white/[0.06]" />
              <DataCol label="Rev Est" value={`$${(earning.revenueEstimate / 1e9).toFixed(1)}B`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-1.5 h-1.5 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-[52px] rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-1 h-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-12 rounded-xl" />
            <Skeleton className="h-10 w-12 rounded-xl" />
            <Skeleton className="h-10 w-12 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <CalendarDays className="w-7 h-7 text-primary" />
      </div>
      <p className="text-[15px] font-bold text-foreground mb-1.5">Markets are quiet</p>
      <p className="text-[12px] text-muted-foreground max-w-[260px] leading-relaxed">
        No US economic events or earnings scheduled right now. Check back tomorrow morning.
      </p>
    </div>
  );
}

/* ── main component ──────────────────────────────────── */

export function EconomicCalendarTab({ active }: { active: boolean }) {
  const {
    todayEvents, thisWeekEvents, upcomingEarnings, earningsByDate,
    isLoading, isError, refetch, isFetching,
    highImpactCount, earningsCount, lastUpdated,
  } = useEconomicCalendar();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");

  // Build event counts per day
  const dayCounts: Record<string, number> = {};
  const today = new Date().toISOString().split("T")[0];
  todayEvents.forEach(() => { dayCounts[today] = (dayCounts[today] || 0) + 1; });
  thisWeekEvents.forEach((e) => { dayCounts[e.date] = (dayCounts[e.date] || 0) + 1; });

  const days = weekDayPills(dayCounts);

  // Grouped week events
  const weekGrouped = groupByDate(thisWeekEvents);
  const filteredWeek = selectedDay ? { [selectedDay]: weekGrouped[selectedDay] || [] } : weekGrouped;

  // Hero event — first high-impact event today
  const heroEvent = todayEvents.find((e) => e.impact === "high");

  // Filter visibility
  const showEconomic = filter === "all" || filter === "high";
  const showEarnings = filter === "all" || filter === "earnings";
  const highOnly = filter === "high";

  if (!active) return null;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Market Pulse Strip */}
      <MarketPulseStrip
        highCount={highImpactCount}
        earningsCount={earningsCount}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isFetching={isFetching}
      />

      {/* Filter Pills */}
      <FilterPills active={filter} onChange={setFilter} />

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center py-16 text-center px-6">
          <p className="text-[13px] text-muted-foreground">Unable to load market data. Try refreshing.</p>
        </div>
      ) : todayEvents.length === 0 && thisWeekEvents.length === 0 && upcomingEarnings.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Economic News ──────────────────────── */}
          {showEconomic && (
            <>
              {/* Hero Card */}
              {heroEvent && !selectedDay && (
                <HeroEventCard event={heroEvent} />
              )}

              {/* Week Pills */}
              <WeekPills days={days} selectedDay={selectedDay} onSelect={setSelectedDay} />

              {/* Today's Events */}
              {todayEvents.length > 0 && !selectedDay && (
                <>
                  <DateDivider dateStr={today} />
                  {todayEvents
                    .filter((e) => !highOnly || e.impact === "high")
                    .filter((e) => !heroEvent || e.id !== heroEvent.id)
                    .sort((a, b) => (a.impact === "high" ? -1 : b.impact === "high" ? 1 : 0))
                    .map((e) => <EventCard key={e.id} event={e} />)}
                </>
              )}

              {/* This Week */}
              {Object.keys(filteredWeek).length > 0 && (
                <>
                  {!selectedDay && <SectionHeader icon={CalendarDays} label="This Week" />}
                  {Object.entries(filteredWeek)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, events]) => {
                      const filtered = (events || []).filter((e) => !highOnly || e.impact === "high");
                      if (filtered.length === 0) return null;
                      return (
                        <div key={date}>
                          <DateDivider dateStr={date} />
                          {filtered
                            .sort((a, b) => (a.impact === "high" ? -1 : b.impact === "high" ? 1 : 0))
                            .map((e) => <EventCard key={e.id} event={e} />)}
                        </div>
                      );
                    })}
                </>
              )}
            </>
          )}

          {/* ── Earnings ───────────────────────────── */}
          {showEarnings && upcomingEarnings.length > 0 && (
            <>
              <SectionHeader icon={TrendingUp} label="Earnings This Week" count={upcomingEarnings.length} />
              {Object.entries(earningsByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, earnings]) => (
                  <div key={date}>
                    <DateDivider dateStr={date} />
                    {earnings.map((e) => <EarningCard key={e.id} earning={e} />)}
                  </div>
                ))}
            </>
          )}

          <div className="h-8" />
        </>
      )}
    </div>
  );
}
