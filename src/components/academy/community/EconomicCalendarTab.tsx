import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useEconomicCalendar, type MarketEvent, type MarketEarning } from "@/hooks/useEconomicCalendar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, differenceInMilliseconds, formatDistanceToNowStrict } from "date-fns";
import { Clock, AlertTriangle, BarChart3, Zap } from "lucide-react";

interface Props {
  active: boolean;
}

/* ── helpers ── */

function impactColor(impact: string) {
  if (impact === "high") return "bg-red-500";
  if (impact === "medium") return "bg-amber-400";
  return "bg-muted-foreground/40";
}

function impactGlow(impact: string) {
  if (impact === "high") return "shadow-[0_0_20px_rgba(239,68,68,0.15)]";
  if (impact === "medium") return "shadow-[0_0_16px_rgba(251,191,36,0.10)]";
  return "";
}

function formatNum(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function dayLabel(dateStr: string) {
  try {
    return format(parseISO(dateStr), "EEEE, MMM d");
  } catch {
    return dateStr;
  }
}

function shortDay(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

/* ── countdown hook ── */
function useCountdown(targetDate: string | null, targetTime: string | null) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const timeStr = targetTime || "09:30:00";
      const target = new Date(`${targetDate}T${timeStr}`);
      const diff = differenceInMilliseconds(target, new Date());
      if (diff <= 0) {
        setLabel("Now");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      if (h > 24) {
        setLabel(`in ${Math.floor(h / 24)}d ${h % 24}h`);
      } else {
        setLabel(`in ${h}h ${m}m`);
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [targetDate, targetTime]);

  return label;
}

/* ── sub-components ── */

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "bg-white/[0.03] border border-white/[0.06] rounded-2xl",
      className
    )}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground tracking-wide">{title}</h3>
      {badge && (
        <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-white/[0.04] px-2.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-mono font-semibold text-foreground">{value}</p>
    </div>
  );
}

/* ── Hero Card ── */
function NextMajorEventCard({ event }: { event: MarketEvent }) {
  const countdown = useCountdown(event.date, event.time_et);
  const isHigh = event.impact === "high";

  return (
    <GlassCard className={cn(
      "p-5 relative overflow-hidden",
      isHigh
        ? "border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.08)]"
        : "border-amber-400/20 shadow-[0_0_24px_rgba(251,191,36,0.06)]"
    )}>
      <div className={cn(
        "absolute top-0 left-0 w-full h-[2px]",
        isHigh
          ? "bg-gradient-to-r from-red-500/60 via-red-500/20 to-transparent"
          : "bg-gradient-to-r from-amber-400/60 via-amber-400/20 to-transparent"
      )} />

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Next Major Event</p>
          <h2 className="text-lg font-bold text-foreground leading-tight">{event.event_name}</h2>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
          isHigh ? "bg-red-500/10 text-red-400" : "bg-amber-400/10 text-amber-400"
        )}>
          <Zap className="w-3 h-3" />
          {countdown || "—"}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-muted-foreground">{shortDay(event.date)}</span>
        {event.time_et && (
          <span className="text-xs font-mono text-muted-foreground">{event.time_et} ET</span>
        )}
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
          isHigh ? "bg-red-500/10 text-red-400" : "bg-amber-400/10 text-amber-400"
        )}>
          {event.impact}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/[0.04]">
        <DataCell label="Previous" value={formatNum(event.prev)} />
        <DataCell label="Forecast" value={formatNum(event.estimate)} />
        <DataCell label="Actual" value={formatNum(event.actual)} />
      </div>
    </GlassCard>
  );
}

/* ── Event Row ── */
function EventCard({ event }: { event: MarketEvent }) {
  return (
    <div className={cn(
      "flex items-stretch gap-0 rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.04]",
      impactGlow(event.impact)
    )}>
      <div className={cn("w-1 shrink-0", impactColor(event.impact))} />
      <div className="flex-1 px-3.5 py-3 flex items-center gap-3">
        <div className="w-16 shrink-0">
          <p className="text-xs font-mono font-semibold text-foreground">{event.time_et || "—"}</p>
          <p className="text-[10px] text-muted-foreground">ET</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{event.event_name}</p>
        </div>
        <div className="hidden sm:grid grid-cols-3 gap-4 shrink-0 w-48">
          <DataCell label="Prev" value={formatNum(event.prev)} />
          <DataCell label="Est" value={formatNum(event.estimate)} />
          <DataCell label="Act" value={formatNum(event.actual)} />
        </div>
      </div>
    </div>
  );
}

/* ── Earning Card ── */
function EarningCard({ earning }: { earning: MarketEarning }) {
  const beat =
    earning.eps_actual !== null && earning.eps_estimate !== null
      ? earning.eps_actual > earning.eps_estimate
      : null;

  return (
    <div className={cn(
      "flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/[0.04]",
      beat === true && "bg-emerald-500/[0.03]",
      beat === false && "bg-red-500/[0.03]",
      beat === null && "bg-white/[0.02]"
    )}>
      <div className="w-16 shrink-0">
        <p className="text-sm font-mono font-bold text-foreground">{earning.symbol}</p>
      </div>
      <span className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
        earning.hour === "Before Open"
          ? "bg-amber-400/10 text-amber-400"
          : earning.hour === "After Close"
          ? "bg-blue-400/10 text-blue-400"
          : "bg-white/[0.06] text-muted-foreground"
      )}>
        {earning.hour === "Before Open" ? "BMO" : earning.hour === "After Close" ? "AMC" : earning.hour}
      </span>
      <div className="flex-1 hidden sm:flex items-center gap-4 justify-end">
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">EPS Est</p>
          <p className="text-xs font-mono font-semibold text-foreground">{formatNum(earning.eps_estimate)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">EPS Act</p>
          <p className={cn(
            "text-xs font-mono font-semibold",
            beat === true ? "text-emerald-400" : beat === false ? "text-red-400" : "text-foreground"
          )}>{formatNum(earning.eps_actual)}</p>
        </div>
        {earning.revenue_estimate !== null && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Rev Est</p>
            <p className="text-xs font-mono font-semibold text-foreground">
              {`$${(earning.revenue_estimate / 1e9).toFixed(1)}B`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Loading Skeleton ── */
function CalendarSkeleton() {
  return (
    <div className="space-y-5 p-5">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
      <Skeleton className="h-8 w-40 rounded-lg" />
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
      </div>
    </div>
  );
}

/* ── MAIN ── */
export function EconomicCalendarTab({ active }: Props) {
  const {
    isLoading,
    todayEvents,
    thisWeekHighImpact,
    nextMajorEvent,
    earningsByDate,
    highImpactCount,
    earningsCount,
    lastUpdated,
  } = useEconomicCalendar();

  if (!active) return null;
  if (isLoading) return <CalendarSkeleton />;

  const updatedAgo = lastUpdated
    ? formatDistanceToNowStrict(lastUpdated, { addSuffix: true })
    : null;

  const sortedEarningsDates = Object.keys(earningsByDate).sort();

  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 py-5 space-y-6">
      {/* Market Pulse Strip */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{highImpactCount}</span> high-impact events
            <span className="mx-1.5 text-white/10">·</span>
            <span className="font-semibold text-foreground">{earningsCount}</span> earnings reports
          </span>
        </div>
        {updatedAgo && (
          <span className="text-[10px] text-muted-foreground/60">Updated {updatedAgo}</span>
        )}
      </div>

      {/* A. Next Major Event */}
      {nextMajorEvent && <NextMajorEventCard event={nextMajorEvent} />}

      {/* B. Today's Events */}
      <section>
        <SectionHeader icon={Clock} title="Today's U.S. Events" badge={`${todayEvents.length}`} />
        {todayEvents.length === 0 ? (
          <GlassCard className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No events scheduled today.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Check back tomorrow for upcoming releases.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      {/* C. This Week High Impact */}
      {thisWeekHighImpact.length > 0 && (
        <section>
          <SectionHeader icon={AlertTriangle} title="This Week — High Impact" badge={`${thisWeekHighImpact.length}`} />
          {(() => {
            const grouped: Record<string, MarketEvent[]> = {};
            thisWeekHighImpact.forEach((e) => {
              if (!grouped[e.date]) grouped[e.date] = [];
              grouped[e.date].push(e);
            });
            return Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, events]) => (
                <div key={date} className="mb-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-1.5 sticky top-0 bg-background/80 backdrop-blur-sm py-1 z-10">
                    {dayLabel(date)}
                  </p>
                  <div className="space-y-1.5">
                    {events.map((e) => <EventCard key={e.id} event={e} />)}
                  </div>
                </div>
              ));
          })()}
        </section>
      )}

      {/* D. Upcoming Earnings */}
      <section>
        <SectionHeader icon={BarChart3} title="Upcoming Earnings" badge={`${earningsCount}`} />
        {sortedEarningsDates.length === 0 ? (
          <GlassCard className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No upcoming earnings data available.</p>
          </GlassCard>
        ) : (
          sortedEarningsDates.map((date) => (
            <div key={date} className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-1.5 sticky top-0 bg-background/80 backdrop-blur-sm py-1 z-10">
                {dayLabel(date)}
              </p>
              <div className="space-y-1.5">
                {earningsByDate[date].map((e) => <EarningCard key={e.id} earning={e} />)}
              </div>
            </div>
          ))
        )}
      </section>

      <div className="h-4" />
    </div>
  );
}
