import { useState, useEffect } from "react";
import { BookOpen, TrendingUp, Video, ClipboardCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

interface WeekStats {
  lessonsCompleted: number;
  tradesLogged: number;
  journalEntries: number;
  weeklyReviewDone: boolean;
}

export function ThisWeekCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const { start, end } = getWeekRange();
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    Promise.all([
      supabase.from("lesson_progress").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("completed", true)
        .gte("completed_at", startISO).lte("completed_at", endISO),
      supabase.from("academy_messages").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("room_slug", "trade-recaps")
        .gte("created_at", startISO).lte("created_at", endISO),
      supabase.from("journal_entries").select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("entry_date", startDate).lte("entry_date", endDate),
    ]).then(([lessonsRes, recapsRes, journalRes]) => {
      setStats({
        lessonsCompleted: lessonsRes.count ?? 0,
        tradesLogged: recapsRes.count ?? 0,
        journalEntries: journalRes.count ?? 0,
        weeklyReviewDone: (journalRes.count ?? 0) > 0,
      });
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="vault-glass-card p-6 flex items-center justify-center h-[200px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = [
    { icon: BookOpen, label: "Lessons completed", value: String(stats?.lessonsCompleted ?? 0), color: "rgba(59,130,246,0.14)" },
    { icon: TrendingUp, label: "Trades logged", value: String(stats?.tradesLogged ?? 0), color: "rgba(34,197,94,0.12)" },
    { icon: Video, label: "Journal entries", value: String(stats?.journalEntries ?? 0), color: "rgba(168,85,247,0.12)" },
    { icon: ClipboardCheck, label: "Weekly review", value: stats?.weeklyReviewDone ? "Done" : "Pending", color: "rgba(245,158,11,0.12)" },
  ];

  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">This Week</h3>

      <div className="grid grid-cols-2 gap-3">
        {items.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ background: s.color }}
                >
                  <Icon className="h-3.5 w-3.5 text-white/80" />
                </div>
              </div>
              <p className="text-lg font-bold text-[rgba(255,255,255,0.92)]">{s.value}</p>
              <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-[rgba(255,255,255,0.45)] mt-0.5">
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
