import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BriefItem {
  kind: "focus" | "caution" | "ahead";
  title: string;
  body: string;
}

interface BriefEvent {
  date: string;
  time: string;
  time_et?: string | null;
  name: string;
  impact: string;
}

const NOTE_META: Record<
  BriefItem["kind"],
  { label: string; surface: string; edge: string; tape: string; text: string; tilt: string }
> = {
  focus: {
    label: "Today's Focus",
    surface: "bg-[hsl(215_85%_58%_/_0.10)]",
    edge: "border-[hsl(215_85%_62%_/_0.28)]",
    tape: "bg-[hsl(215_85%_62%_/_0.35)]",
    text: "text-[hsl(213_95%_78%)]",
    tilt: "-rotate-[0.5deg]",
  },
  caution: {
    label: "Be Careful",
    surface: "bg-[hsl(38_92%_55%_/_0.10)]",
    edge: "border-[hsl(38_92%_60%_/_0.28)]",
    tape: "bg-[hsl(38_92%_60%_/_0.35)]",
    text: "text-[hsl(41_96%_74%)]",
    tilt: "rotate-[0.6deg]",
  },
  ahead: {
    label: "Coming Up",
    surface: "bg-[hsl(158_70%_48%_/_0.10)]",
    edge: "border-[hsl(158_70%_52%_/_0.26)]",
    tape: "bg-[hsl(158_70%_52%_/_0.32)]",
    text: "text-[hsl(156_72%_72%)]",
    tilt: "-rotate-[0.35deg]",
  },
};


function formatDay(date: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (date === todayStr) return "Today";
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/** Converts an ET clock time into the viewer's local clock, when it differs. */
function localEquivalent(date: string, timeEt?: string | null): string | null {
  if (!timeEt) return null;
  const [h, m] = timeEt.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  const utc = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}:00-04:00`);
  if (isNaN(utc.getTime())) return null;
  const local = utc.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const et = utc.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
  return local === et ? null : local;
}

export function DailyBriefCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<BriefItem[] | null>(null);
  const [events, setEvents] = useState<BriefEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("morning-brief");
        if (cancelled) return;
        if (error || !data?.items?.length) {
          setFailed(true);
        } else {
          setItems(data.items as BriefItem[]);
          setEvents((data.events || []) as BriefEvent[]);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <section className="vault-luxury-card overflow-hidden animate-pulse">
        <div className="px-5 py-4 space-y-4">
          <div className="h-2.5 w-32 rounded-full bg-muted/40" />
          <div className="h-3 w-3/4 rounded-full bg-muted/25" />
          <div className="h-3 w-2/3 rounded-full bg-muted/20" />
          <div className="h-3 w-1/2 rounded-full bg-muted/15" />
        </div>
      </section>
    );
  }

  if (failed || !items?.length) return null;

  return (
    <section className="vault-luxury-card overflow-hidden">
      {/* Masthead */}
      <header className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h2 className="text-[15px] md:text-base font-semibold tracking-tight text-foreground">
            The Brief
          </h2>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
            Daily
          </span>
        </div>
        <time className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50 shrink-0">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </time>
      </header>

      {/* Editorial rows — hairline separated, no nested boxes */}
      <div className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
        {items.map((item, i) => {
          const meta = ROW_META[item.kind] || ROW_META.focus;
          return (
            <article key={i} className="relative pl-5 pr-5 py-4">
              <span className={`absolute left-0 top-4 bottom-4 w-[2px] rounded-full ${meta.accent} opacity-60`} />
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`h-1 w-1 rounded-full ${meta.dot}`} />
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/55">
                  {meta.label}
                </span>
              </div>
              <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-1 text-[13px] leading-[1.65] text-muted-foreground/85">{item.body}</p>
            </article>
          );
        })}
      </div>

      {/* Data rail */}
      {events.length > 0 && (
        <div className="px-5 pt-3.5 pb-4">
          <div className="flex items-baseline justify-between mb-2.5">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/50">
              Market Catalysts
            </p>
            <p className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/35">
              Official releases · ET
            </p>
          </div>
          <ul className="space-y-0">
            {events.slice(0, 6).map((e, i) => {
              const local = localEquivalent(e.date, e.time_et);
              const isToday = formatDay(e.date) === "Today";
              return (
                <li
                  key={i}
                  className="flex items-baseline gap-3 py-2 border-b border-white/[0.04] last:border-0"
                >
                  <span
                    className={`w-11 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      isToday ? "text-primary" : "text-muted-foreground/50"
                    }`}
                  >
                    {formatDay(e.date)}
                  </span>
                  <span className="flex-1 min-w-0 text-[12.5px] font-medium text-foreground/90 truncate">
                    {e.name}
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block text-[11.5px] font-semibold tabular-nums ${
                        e.impact === "high" ? "text-amber-300/90" : "text-muted-foreground/70"
                      }`}
                    >
                      {e.time}
                    </span>
                    {local && (
                      <span className="block text-[9.5px] tabular-nums text-muted-foreground/40">
                        {local} local
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
