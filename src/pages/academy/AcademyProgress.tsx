import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { BookOpen, PenLine, BarChart3, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface WeeklyStats {
  lessonsCompleted: number;
  journalEntries: number;
  recapsPosted: number;
  topMistake: string | null;
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

const MISTAKE_LABELS: Record<string, string> = {
  none: "None",
  oversized: "Oversized position",
  revenge: "Revenge trade",
  fomo: "FOMO entry",
  "no-stop": "No stop-loss",
};

const AcademyProgress = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      setLoading(true);
      const { start, end } = getWeekRange();
      const startISO = start.toISOString();
      const endISO = end.toISOString();
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);

      // Parallel queries
      const [lessonsRes, journalRes, recapsRes] = await Promise.all([
        supabase
          .from("lesson_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("completed", true)
          .gte("completed_at", startISO)
          .lte("completed_at", endISO),
        (supabase as any)
          .from("journal_entries")
          .select("biggest_mistake")
          .eq("user_id", user!.id)
          .gte("entry_date", startDate)
          .lte("entry_date", endDate),
        supabase
          .from("academy_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id)
          .eq("room_slug", "trade-recaps")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
      ]);

      const journalRows = journalRes.data ?? [];
      const journalCount = journalRows.length;

      // Compute top mistake (excluding "none")
      const mistakeCounts: Record<string, number> = {};
      for (const row of journalRows) {
        const m = row.biggest_mistake;
        if (m && m !== "none") {
          mistakeCounts[m] = (mistakeCounts[m] || 0) + 1;
        }
      }
      const topMistake = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      setStats({
        lessonsCompleted: lessonsRes.count ?? 0,
        journalEntries: journalCount,
        recapsPosted: recapsRes.count ?? 0,
        topMistake,
      });
      setLoading(false);
    }

    load();
  }, [user]);

  const { start, end } = getWeekRange();
  const weekLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <AcademyLayout>
      <PageHeader title="Weekly Progress" subtitle={weekLabel} />
      <div className="px-4 md:px-6 pb-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
            <StatCard icon={BookOpen} label="Lessons Completed" value={stats.lessonsCompleted} />
            <StatCard icon={PenLine} label="Journal Entries" value={stats.journalEntries} />
            <StatCard icon={BarChart3} label="Trades Posted" value={stats.recapsPosted} />
            <Card className="vault-card p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Top Mistake</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {stats.topMistake ? MISTAKE_LABELS[stats.topMistake] || stats.topMistake : "None this week"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </AcademyLayout>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number }) {
  return (
    <Card className="vault-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default AcademyProgress;
