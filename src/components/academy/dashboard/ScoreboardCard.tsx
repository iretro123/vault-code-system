import { useState, useEffect } from "react";
import { Shield, TrendingUp, Flame, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Tab = "discipline" | "trades";

interface Stats {
  compliance: number;
  tradesLogged: number;
  streakDays: number;
  largestBreak: string;
  dailyStatuses: string[]; // 7 items: "green" | "yellow" | "red" | "none"
}

const SCOREBOARD_CACHE = "va_cache_scoreboard";

function readScoreboardCache(): Stats | null {
  try {
    const raw = localStorage.getItem(SCOREBOARD_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function ScoreboardCard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("discipline");
  const cached = readScoreboardCache();
  const [stats, setStats] = useState<Stats | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    Promise.all([
      supabase
        .from("vault_daily_checklist")
        .select("id, date, completed")
        .eq("user_id", user.id)
        .gte("date", weekAgo.toISOString().slice(0, 10))
        .order("date", { ascending: true }),
      supabase
        .from("academy_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("room_slug", "trade-recaps")
        .gte("created_at", weekAgoISO),
      supabase
        .from("journal_entries")
        .select("followed_rules, biggest_mistake")
        .eq("user_id", user.id)
        .gte("entry_date", weekAgo.toISOString().slice(0, 10))
        .order("entry_date", { ascending: false }),
    ]).then(([checkinsRes, tradesRes, journalRes]) => {
      const checkins = checkinsRes.data ?? [];
      const completedCount = checkins.filter((c: any) => c.completed).length;
      const compliance = checkins.length > 0 ? Math.round((completedCount / Math.max(checkins.length, 7)) * 100) : 0;

      const journals = journalRes.data ?? [];
      const breaks = journals.filter((j: any) => !j.followed_rules);
      const largestBreak = breaks.length > 0
        ? (breaks[0] as any).biggest_mistake || "Rule break logged"
        : "None this week";

      // Build 7-day strip
      const statuses: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const entry = checkins.find((c: any) => c.date === dateStr);
        if (!entry) statuses.push("none");
        else if ((entry as any).completed) statuses.push("green");
        else statuses.push("yellow");
      }

      const result: Stats = {
        compliance,
        tradesLogged: tradesRes.count ?? 0,
        streakDays: completedCount,
        largestBreak: largestBreak.length > 50 ? largestBreak.slice(0, 50) + "…" : largestBreak,
        dailyStatuses: statuses,
      };
      setStats(result);
      try { localStorage.setItem(SCOREBOARD_CACHE, JSON.stringify(result)); } catch {}
      setLoading(false);
    });
  }, [user]);

  if (loading && !stats) {
    return (
      <div className="vault-glass-card p-6 space-y-5 animate-pulse">
        <div className="h-5 w-32 rounded bg-white/[0.06]" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-white/[0.03]" />)}
        </div>
        <div className="flex gap-1.5">
          {[1,2,3,4,5,6,7].map(i => <div key={i} className="flex-1 h-6 rounded-md bg-white/[0.03]" />)}
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "discipline", label: "Discipline" },
    { key: "trades", label: "Trades" },
  ];

  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="vault-glass-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Scoreboard</h2>
        <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground">
          Last 7 days
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors duration-100 ${
              tab === t.key
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          icon={Shield}
          label="Rule Compliance"
          value={`${stats?.compliance ?? 0}%`}
          color="text-emerald-400"
        />
        <MetricTile
          icon={TrendingUp}
          label="Trades Logged"
          value={String(stats?.tradesLogged ?? 0)}
          color="text-primary"
        />
        <MetricTile
          icon={Flame}
          label="Streak Days"
          value={`${stats?.streakDays ?? 0}d`}
          color="text-amber-400"
        />
        <MetricTile
          icon={AlertTriangle}
          label="Largest Break"
          value={stats?.largestBreak ?? "—"}
          color="text-rose-400"
          small
        />
      </div>

      {/* 7-day strip */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground/60">
          7-Day Activity
        </p>
        <div className="flex gap-1.5">
          {(stats?.dailyStatuses ?? []).map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-6 w-full rounded-md ${
                  s === "green" ? "bg-emerald-500/30" :
                  s === "yellow" ? "bg-amber-500/30" :
                  s === "red" ? "bg-rose-500/30" :
                  "bg-white/[0.04]"
                }`}
              />
              <span className="text-[9px] text-muted-foreground/50 font-medium">
                {DAY_LABELS[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  color,
  small,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground/60">
          {label}
        </span>
      </div>
      <p className={`font-bold text-foreground/90 leading-tight ${small ? "text-xs line-clamp-2" : "text-lg"}`}>
        {value}
      </p>
    </div>
  );
}
