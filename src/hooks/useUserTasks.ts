import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

const ONBOARDING_SEEDS = [
  { title: "Claim Role", description: "Set your experience level", type: "onboarding", profileFlag: "role_level" },
  { title: "Watch First Lesson", description: "Complete a module lesson", type: "onboarding", profileFlag: "first_lesson_started" },
  { title: "Introduce Yourself", description: "Post in the community", type: "onboarding", profileFlag: "intro_posted" },
] as const;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

const DAILY_TASKS_DEFAULT = [
  { title: "Watch 1 lesson (10–15 min)", description: "Keep your learning streak alive" },
  { title: "Journal 1 trade (2 min)", description: "Log at least one trade today" },
];

const DAILY_TASKS_ADVANCED = [
  { title: "Post 1 trade", description: "Share a trade with the community" },
  { title: "Journal 1 trade (2 min)", description: "Log at least one trade today" },
];

const TASKS_CACHE_KEY = "va_cache_user_tasks";

function readTasksCache(): UserTask[] {
  try {
    const raw = localStorage.getItem(TASKS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useUserTasks() {
  const { user, profile } = useAuth();
  const cached = readTasksCache();
  const [tasks, setTasks] = useState<UserTask[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      setLoading(true);

      // Fetch existing tasks
      const { data, error } = await (supabase as any)
        .from("user_task")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });

      if (error) { console.error(error); setLoading(false); return; }

      let rows: UserTask[] = data ?? [];

      // Seed onboarding tasks if no tasks at all exist
      if (rows.length === 0 && !seeded) {
        const seeds = ONBOARDING_SEEDS.map((s) => {
          const done = profile ? !!(profile as any)[s.profileFlag] : false;
          return {
            user_id: user!.id,
            title: s.title,
            description: s.description,
            type: s.type,
            status: done ? "done" : "pending",
            completed_at: done ? new Date().toISOString() : null,
          };
        });

        const { data: inserted, error: insertErr } = await (supabase as any)
          .from("user_task")
          .insert(seeds)
          .select("*");

        if (!insertErr && inserted) rows = inserted;
        setSeeded(true);
      }

      // Daily task seeding: if no daily tasks for today, create 2
      const today = todayDateString();
      const hasDailyToday = rows.some((t) => t.type === "daily" && t.due_date === today);

      if (!hasDailyToday) {
        const isAdvanced = profile?.role_level === "advanced";
        const templates = isAdvanced ? DAILY_TASKS_ADVANCED : DAILY_TASKS_DEFAULT;

        const dailySeeds = templates.map((t) => ({
          user_id: user!.id,
          title: t.title,
          description: t.description,
          type: "daily",
          status: "pending",
          due_date: today,
        }));

        const { data: inserted, error: insertErr } = await (supabase as any)
          .from("user_task")
          .insert(dailySeeds)
          .select("*");

        if (!insertErr && inserted) {
          rows = [...rows, ...inserted];
        }
      }

      setTasks(rows);
      try { localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(rows)); } catch {}
      setLoading(false);
    }

    load();
  }, [user, profile, seeded]);

  return { tasks, loading };
}
