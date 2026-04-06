import { cn } from "@/lib/utils";
import { useEconomicCalendar, type MarketEvent } from "@/hooks/useEconomicCalendar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { Calendar } from "lucide-react";

interface Props {
  active: boolean;
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

export function EconomicCalendarTab({ active }: Props) {
  const { isLoading, allEvents } = useEconomicCalendar();

  if (!active) return null;
  if (isLoading) return <CalendarSkeleton />;

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

      {dates.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No events scheduled.</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Check back when new data is available.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map((date) => (
            <section key={date}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-2.5 sticky top-0 bg-background/90 backdrop-blur-sm py-1.5 z-10">
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
                          <p className="text-xs font-mono font-semibold text-foreground">{e.time_et || "—"}</p>
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
          ))}
        </div>
      )}
    </div>
  );
}
