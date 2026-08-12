import { useEffect, useState } from "react";
import { Sparkles, ShieldAlert, CalendarClock, RefreshCw } from "lucide-react";
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
  name: string;
  impact: string;
}

const STYLES: Record<
  BriefItem["kind"],
  { icon: typeof Sparkles; ring: string; iconColor: string; label: string }
> = {
  focus: {
    icon: Sparkles,
    ring: "border-primary/20 bg-primary/[0.04]",
    iconColor: "text-primary",
    label: "Today",
  },
  caution: {
    icon: ShieldAlert,
    ring: "border-amber-500/20 bg-amber-500/[0.04]",
    iconColor: "text-amber-400",
    label: "Watch out",
  },
  ahead: {
    icon: CalendarClock,
    ring: "border-emerald-500/20 bg-emerald-500/[0.04]",
    iconColor: "text-emerald-400",
    label: "Coming up",
  },
};

function formatDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (date === todayStr) return "Today";
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
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
      <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3 animate-pulse">
        <div className="h-3 w-28 rounded bg-muted/50" />
        <div className="h-14 rounded-xl bg-muted/30" />
        <div className="h-14 rounded-xl bg-muted/30" />
      </div>
    );
  }

  if (failed || !items?.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4 md:p-5 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Your Daily Brief
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground/60">
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item, i) => {
          const style = STYLES[item.kind] || STYLES.focus;
          const Icon = style.icon;
          return (
            <div
              key={i}
              className={`rounded-xl border ${style.ring} p-3.5 flex gap-3 items-start`}
            >
              <div className="mt-0.5 shrink-0">
                <Icon className={`h-4 w-4 ${style.iconColor}`} />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {events.length > 0 && (
        <div className="pt-1 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Key data this week
          </p>
          <div className="flex flex-wrap gap-1.5">
            {events.slice(0, 6).map((e, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${
                  e.impact === "high"
                    ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-300"
                    : "border-border bg-muted/20 text-muted-foreground"
                }`}
              >
                <span className="font-semibold">{formatDay(e.date)}</span>
                <span className="truncate max-w-[150px]">{e.name}</span>
                {e.time && <span className="text-muted-foreground/60">{e.time}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
