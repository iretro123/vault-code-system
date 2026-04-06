import { useState } from "react";
import { CalendarDays, TrendingUp, Clock, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEconomicCalendar, EconomicEvent, EarningsEvent } from "@/hooks/useEconomicCalendar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isToday, startOfWeek, addDays } from "date-fns";

/* ── helpers ─────────────────────────────────────────── */

function impactColor(impact: string) {
  if (impact === "high") return "bg-red-500";
  if (impact === "medium") return "bg-amber-400";
  return "bg-muted-foreground/40";
}

function impactLabel(impact: string) {
  if (impact === "high") return "High";
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

function weekDayPills() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 5 }, (_, i) => {
    const d = addDays(start, i);
    return { date: format(d, "yyyy-MM-dd"), label: format(d, "EEE"), dayNum: format(d, "d"), isToday: isToday(d) };
  });
}

/* ── sub-components ──────────────────────────────────── */

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-5 pb-2">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

function EventRow({ event }: { event: EconomicEvent }) {
  return (
    <div className="flex items-stretch gap-0 mx-4 mb-1.5 rounded-xl bg-card/60 border border-white/[0.04] overflow-hidden hover:border-white/[0.08] transition-colors">
      <div className={cn("w-1 shrink-0 rounded-l-xl", impactColor(event.impact))} />
      <div className="flex-1 flex items-center justify-between px-3.5 py-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{event.event}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {event.time && (
              <span className="text-[10px] text-muted-foreground font-medium">{event.time}</span>
            )}
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md",
              event.impact === "high" ? "bg-red-500/15 text-red-400" :
              event.impact === "medium" ? "bg-amber-400/15 text-amber-400" :
              "bg-muted text-muted-foreground"
            )}>
              {impactLabel(event.impact)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 pl-3">
          <ValueCell label="Prev" value={formatVal(event.prev, event.unit)} />
          <ValueCell label="Est" value={formatVal(event.estimate, event.unit)} />
          <ValueCell label="Act" value={formatVal(event.actual, event.unit)} highlight={event.actual !== null} />
        </div>
      </div>
    </div>
  );
}

function ValueCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-right min-w-[42px]">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">{label}</p>
      <p className={cn(
        "text-[13px] font-mono font-semibold leading-none",
        highlight ? "text-primary" : "text-foreground/80"
      )}>{value}</p>
    </div>
  );
}

function EarningsRow({ earning }: { earning: EarningsEvent }) {
  return (
    <div className="flex items-center justify-between mx-4 mb-1.5 px-3.5 py-3 rounded-xl bg-card/60 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-mono font-bold text-foreground bg-white/[0.06] px-2 py-0.5 rounded-md tracking-wide">
          {earning.symbol}
        </span>
        <div className="min-w-0">
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md",
            earning.hour === "Before Open" ? "bg-amber-400/15 text-amber-400" :
            earning.hour === "After Close" ? "bg-blue-400/15 text-blue-400" :
            "bg-muted text-muted-foreground"
          )}>
            {earning.hour}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <ValueCell label="EPS Est" value={earning.epsEstimate !== null ? `$${earning.epsEstimate}` : "—"} />
        <ValueCell label="EPS Act" value={earning.epsActual !== null ? `$${earning.epsActual}` : "—"} highlight={earning.epsActual !== null} />
      </div>
    </div>
  );
}

function DateHeader({ dateStr }: { dateStr: string }) {
  const d = parseISO(dateStr);
  const label = isToday(d) ? "Today" : format(d, "EEEE, MMM d");
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-background/90 backdrop-blur-sm border-b border-white/[0.04]">
      <CalendarDays className="w-3.5 h-3.5 text-primary" />
      <span className="text-[12px] font-bold text-foreground tracking-wide">{label}</span>
      {isToday(d) && (
        <span className="ml-auto text-[10px] text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</span>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <CalendarDays className="w-6 h-6 text-primary" />
      </div>
      <p className="text-[14px] font-semibold text-foreground mb-1">Markets are quiet today</p>
      <p className="text-[12px] text-muted-foreground max-w-[240px]">No US economic events or earnings scheduled. Check back tomorrow.</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-1 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-8 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── main component ──────────────────────────────────── */

export function EconomicCalendarTab({ active }: { active: boolean }) {
  const { todayEvents, thisWeekEvents, upcomingEarnings, isLoading, isError, refetch, isFetching } = useEconomicCalendar();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const days = weekDayPills();

  // Group this week events by date
  const weekGrouped = groupByDate(thisWeekEvents);
  const filteredWeek = selectedDay ? { [selectedDay]: weekGrouped[selectedDay] || [] } : weekGrouped;

  // Count events per day for dot indicators
  const dayCounts: Record<string, number> = {};
  thisWeekEvents.forEach((e) => {
    dayCounts[e.date] = (dayCounts[e.date] || 0) + 1;
  });
  todayEvents.forEach((e) => {
    const today = new Date().toISOString().split("T")[0];
    dayCounts[today] = (dayCounts[today] || 0) + 1;
  });

  if (!active) return null;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Refresh bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-bold text-foreground">US Market Calendar</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Week day pills */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-none">
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)}
            className={cn(
              "flex flex-col items-center gap-0.5 min-w-[44px] px-2 py-1.5 rounded-xl text-center transition-all",
              selectedDay === day.date
                ? "bg-primary text-primary-foreground"
                : day.isToday
                ? "bg-primary/10 text-primary"
                : "bg-card/60 text-muted-foreground hover:bg-card"
            )}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider">{day.label}</span>
            <span className="text-[14px] font-bold leading-none">{day.dayNum}</span>
            {(dayCounts[day.date] || 0) > 0 && (
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: Math.min(dayCounts[day.date] || 0, 3) }).map((_, i) => (
                  <div key={i} className={cn("w-1 h-1 rounded-full", selectedDay === day.date ? "bg-primary-foreground" : "bg-primary")} />
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center py-12 text-center px-6">
          <p className="text-[13px] text-muted-foreground">Unable to load calendar data. Try refreshing.</p>
        </div>
      ) : todayEvents.length === 0 && thisWeekEvents.length === 0 && upcomingEarnings.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Today */}
          {todayEvents.length > 0 && !selectedDay && (
            <>
              <DateHeader dateStr={new Date().toISOString().split("T")[0]} />
              {todayEvents
                .sort((a, b) => (a.impact === "high" ? -1 : b.impact === "high" ? 1 : 0))
                .map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
            </>
          )}

          {/* This Week */}
          {Object.keys(filteredWeek).length > 0 && (
            <>
              {!selectedDay && <SectionHeader icon={CalendarDays} label="This Week" />}
              {Object.entries(filteredWeek)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, events]) =>
                  events && events.length > 0 ? (
                    <div key={date}>
                      <DateHeader dateStr={date} />
                      {events
                        .sort((a, b) => (a.impact === "high" ? -1 : b.impact === "high" ? 1 : 0))
                        .map((e) => (
                          <EventRow key={e.id} event={e} />
                        ))}
                    </div>
                  ) : null
                )}
            </>
          )}

          {/* Earnings */}
          {upcomingEarnings.length > 0 && !selectedDay && (
            <>
              <SectionHeader icon={TrendingUp} label="Upcoming Earnings" />
              {upcomingEarnings.map((e) => (
                <EarningsRow key={e.id} earning={e} />
              ))}
            </>
          )}

          <div className="h-6" />
        </>
      )}
    </div>
  );
}
