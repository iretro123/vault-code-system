import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Runs once per login session. Creates max 1 notification per day:
 * - If pending tasks exist → "Quick reminder" with top task title
 * - Else if all yesterday's daily tasks are done → "Streak kept"
 */
export function useLoginReminder() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;

    async function run() {
      const today = todayDateString();
      const userId = user!.id;

      // Check if we already sent a notification today (any type except meltdown-triggered)
      const { data: existing } = await (supabase as any)
        .from("notification_log")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00Z`)
        .in("type", ["reminder", "streak", "support"])
        .limit(1);

      if (existing && existing.length > 0) return; // already notified today

      // Weekly review: every 7 days, check last "support" notification
      const { data: lastWeekly } = await (supabase as any)
        .from("notification_log")
        .select("created_at")
        .eq("user_id", userId)
        .eq("type", "support")
        .eq("title", "Weekly review ready")
        .order("created_at", { ascending: false })
        .limit(1);

      const daysSinceLast = lastWeekly?.[0]
        ? Math.floor((Date.now() - new Date(lastWeekly[0].created_at).getTime()) / 86400000)
        : 999;

      if (daysSinceLast >= 7) {
        await (supabase as any).from("notification_log").insert({
          user_id: userId,
          type: "support",
          title: "Weekly review ready",
          body: "Your week is ready. 60 seconds to review.",
        });
        return;
      }

      // Fetch today's pending tasks (daily + onboarding)
      const { data: pendingTasks } = await (supabase as any)
        .from("user_task")
        .select("title")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);

      if (pendingTasks && pendingTasks.length > 0) {
        await (supabase as any).from("notification_log").insert({
          user_id: userId,
          type: "reminder",
          title: "Quick reminder",
          body: `Finish: ${pendingTasks[0].title}`,
        });
        return;
      }

      // No pending tasks — check if yesterday's daily tasks were all completed
      const yesterday = yesterdayDateString();
      const { data: yesterdayTasks } = await (supabase as any)
        .from("user_task")
        .select("status")
        .eq("user_id", userId)
        .eq("type", "daily")
        .eq("due_date", yesterday);

      if (yesterdayTasks && yesterdayTasks.length > 0) {
        const allDone = yesterdayTasks.every((t: any) => t.status === "done");
        if (allDone) {
          await (supabase as any).from("notification_log").insert({
            user_id: userId,
            type: "streak",
            title: "Streak kept",
            body: "You stayed consistent yesterday. Keep it clean today.",
          });
        }
      }
    }

    run().catch(console.error);
  }, [user]);
}
