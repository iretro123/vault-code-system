import { useState } from "react";
import { cn } from "@/lib/utils";
import { useEconomicCalendar, type MarketEvent, type MarketEarning } from "@/hooks/useEconomicCalendar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { ArrowLeft, BarChart3, Calendar, TrendingUp } from "lucide-react";

interface Props {
  active: boolean;
}

type View = "select" | "earnings" | "economic";

/* ── helpers ── */

function impactColor(impact: string) {
  if (impact === "high") return "bg-red-500";
  if (impact === "medium") return "bg-amber-400";
  return "bg-muted-foreground/30";
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

function formatRevenue(v: number | null) {
  if (v === null || v === undefined) return "—";
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

/* ── Selection Screen ── */
function SelectionScreen({ onSelect }: { onSelect: (v: View) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4 py-12">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Market Intelligence</p>
      <h2 className="text-xl font-bold text-foreground mb-8">What do you want to check?</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-lg">
        {/* Earnings Card */}
        <button
          onClick={() => onSelect("earnings")}
          className={cn(
            "group relative text-left p-7 rounded-2xl border transition-all duration-200",
            "bg-white/[0.03] border-white/[0.06]",
            "hover:border-white/[0.14] hover:bg-white/[0.05]",
            "hover:shadow-[0_0_40px_rgba(59,130,246,0.06)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent rounded-t-2xl" />
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Earnings Calendar</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">This week's earnings reports — tickers, dates, EPS & revenue estimates.</p>
          <TrendingUp className="absolute bottom-5 right-5 w-4 h-4 text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />
        </button>

        {/* Economic Calendar Card */}
        <button
          onClick={() => onSelect("economic")}
          className={cn(
            "group relative text-left p-7 rounded-2xl border transition-all duration-200",
            "bg-white/[0.03] border-white/[0.06]",
            "hover:border-white/[0.14] hover:bg-white/[0.05]",
            "hover:shadow-[0_0_40px_rgba(59,130,246,0.06)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent rounded-t-2xl" />
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Calendar className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Economic Calendar</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">U.S. market-moving events — CPI, FOMC, NFP, GDP & more.</p>
          <TrendingUp className="absolute bottom-5 right-5 w-4 h-4 text-muted-foreground/30 group-hover:text-amber-400/40 transition-colors" />
        </button>
      </div>
    </div>
  );
}

/* ── Back Header ── */
function ViewHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button
        onClick={onBack}
        className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
    </div>
  );
}

/* ── Earnings View ── */
function EarningsView({ earningsByDate, onBack }: { earningsByDate: Record<string, MarketEarning[]>; onBack: () => void }) {
  const dates = Object.keys(earningsByDate).sort();

  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 py-5">
      <ViewHeader title="Earnings This Week" onBack={onBack} />

      {dates.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No upcoming earnings data available.</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Check back when the market is active.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map((date) => (
            <section key={date}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-semibold mb-2.5 sticky top-0 bg-background/90 backdrop-blur-sm py-1.5 z-10">
                {dayLabel(date)}
              </p>
              <div className="space-y-1">
                {earningsByDate[date].map((e) => {
                  const beat =
                    e.eps_actual !== null && e.eps_estimate !== null
                      ? e.eps_actual > e.eps_estimate
                      : null;

                  return (
                    <div
                      key={e.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.04]",
                        beat === true && "bg-emerald-500/[0.03]",
                        beat === false && "bg-red-500/[0.03]",
                        beat === null && "bg-white/[0.02]"
                      )}
                    >
                      {/* Ticker */}
                      <span className="text-sm font-mono font-bold text-foreground w-16 shrink-0">
                        {e.symbol}
                      </span>

                      {/* BMO/AMC badge */}
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
                          e.hour === "Before Open"
                            ? "bg-amber-400/10 text-amber-400"
                            : e.hour === "After Close"
                            ? "bg-blue-400/10 text-blue-400"
                            : "bg-white/[0.05] text-muted-foreground"
                        )}
                      >
                        {e.hour === "Before Open" ? "BMO" : e.hour === "After Close" ? "AMC" : e.hour}
                      </span>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* EPS */}
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-muted-foreground/60">EPS Est</p>
                        <p className="text-xs font-mono font-semibold text-foreground">
                          {formatNum(e.eps_estimate)}
                        </p>
                      </div>

                      {/* EPS Actual */}
                      {e.eps_actual !== null && (
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-muted-foreground/60">EPS Act</p>
                          <p
                            className={cn(
                              "text-xs font-mono font-semibold",
                              beat === true ? "text-emerald-400" : beat === false ? "text-red-400" : "text-foreground"
                            )}
                          >
                            {formatNum(e.eps_actual)}
                          </p>
                        </div>
                      )}

                      {/* Revenue */}
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-muted-foreground/60">Rev Est</p>
                        <p className="text-xs font-mono font-semibold text-foreground">
                          {formatRevenue(e.revenue_estimate)}
                        </p>
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

/* ── Economic View ── */
function EconomicView({ events, onBack }: { events: MarketEvent[]; onBack: () => void }) {
  // Group by date
  const grouped: Record<string, MarketEvent[]> = {};
  events.forEach((e) => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });
  const dates = Object.keys(grouped).sort();

  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 py-5">
      <ViewHeader title="U.S. Economic Events — This Week" onBack={onBack} />

      {dates.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No events scheduled this week.</p>
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
                      {/* Impact bar */}
                      <div className={cn("w-1 shrink-0", impactColor(e.impact))} />

                      <div className="flex-1 px-4 py-3 flex items-center gap-3">
                        {/* Time */}
                        <div className="w-14 shrink-0">
                          <p className="text-xs font-mono font-semibold text-foreground">{e.time_et || "—"}</p>
                          <p className="text-[9px] text-muted-foreground/50">ET</p>
                        </div>

                        {/* Event name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{e.event_name}</p>
                        </div>

                        {/* Impact badge */}
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

                        {/* Data columns (desktop) */}
                        <div className="hidden sm:grid grid-cols-3 gap-4 shrink-0 w-44">
                          <div className="text-center">
                            <p className="text-[9px] uppercase text-muted-foreground/50">Prev</p>
                            <p className="text-xs font-mono font-semibold text-foreground">{formatNum(e.prev)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] uppercase text-muted-foreground/50">Est</p>
                            <p className="text-xs font-mono font-semibold text-foreground">{formatNum(e.estimate)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] uppercase text-muted-foreground/50">Act</p>
                            <p className="text-xs font-mono font-semibold text-foreground">{formatNum(e.actual)}</p>
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

/* ── Loading Skeleton ── */
function CalendarSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4 py-12 space-y-5">
      <Skeleton className="h-5 w-32 rounded-lg" />
      <Skeleton className="h-7 w-56 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-lg">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/* ── MAIN ── */
export function EconomicCalendarTab({ active }: Props) {
  const [view, setView] = useState<View>("select");
  const { isLoading, allEvents, earningsByDate } = useEconomicCalendar();

  if (!active) return null;
  if (isLoading) return <CalendarSkeleton />;

  if (view === "earnings") {
    return <EarningsView earningsByDate={earningsByDate} onBack={() => setView("select")} />;
  }

  if (view === "economic") {
    return <EconomicView events={allEvents} onBack={() => setView("select")} />;
  }

  return <SelectionScreen onSelect={setView} />;
}
