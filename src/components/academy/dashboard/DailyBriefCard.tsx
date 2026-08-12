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

interface NextLive {
  title: string;
  session_date: string;
  join_url: string | null;
}

export function DailyBriefCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<BriefItem[] | null>(null);
  const [events, setEvents] = useState<BriefEvent[]>([]);
  const [nextLive, setNextLive] = useState<NextLive | null>(null);
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

    // Live sessions are read fresh (not from the cached brief) so a call
    // scheduled later today shows up on the sticky note immediately.
    (async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("title, session_date, join_url")
        .eq("is_replay", false)
        .gte("session_date", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order("session_date", { ascending: true })
        .limit(1);
      if (!cancelled && data?.[0]) setNextLive(data[0] as NextLive);
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
            Today's Notes
          </h2>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
            Updated daily
          </span>
        </div>
        <time className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50 shrink-0">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </time>
      </header>

      {/* Sticky notes */}
      <div className="px-4 pb-1 space-y-2.5">
        {items.map((item, i) => {
          const meta = NOTE_META[item.kind] || NOTE_META.focus;
          return (
            <article
              key={i}
              className={`relative rounded-[14px] border ${meta.edge} ${meta.surface} ${meta.tilt} px-4 pt-4 pb-3.5 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.9)] backdrop-blur-[2px]`}
            >
              {/* tape strip */}
              <span
                className={`absolute -top-[3px] left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full ${meta.tape}`}
              />
              <span
                className={`text-[9.5px] font-semibold uppercase tracking-[0.22em] ${meta.text}`}
              >
                {meta.label}
              </span>
              <h3 className="mt-1.5 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-1 text-[13px] leading-[1.65] text-muted-foreground/85">{item.body}</p>

              {/* Live call row — always reflects the latest scheduled session */}
              {item.kind === "ahead" && nextLive && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2.5">
                  <span className="min-w-0 flex-1 text-[12px] font-medium text-foreground/90">
                    <span className="truncate">{nextLive.title}</span>
                    <span className="ml-1.5 text-muted-foreground/60 tabular-nums">
                      {new Date(nextLive.session_date).toLocaleString("en-US", {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  {nextLive.join_url ? (
                    <a
                      href={nextLive.join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`shrink-0 rounded-full border ${meta.edge} px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] ${meta.text} hover:bg-white/[0.06]`}
                    >
                      Join call
                    </a>
                  ) : (
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/40">
                      Link soon
                    </span>
                  )}
                </div>
              )}

              {/* folded corner */}
              <span className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 rounded-br-[14px] bg-gradient-to-tl from-white/[0.07] to-transparent" />
            </article>
          );
        })}
      </div>

      {/* Data rail */}
      {events.length > 0 && (
        <div className="px-5 pt-4 pb-4">
          <div className="flex items-baseline justify-between mb-2.5">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/50">
              Big News This Week
            </p>
            <p className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/35">
              Release times · ET
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
