import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Generates smart in-app notifications based on user behavior.
 * Runs once per session. Creates max 1 smart notification per day.
 * 
 * Types:
 * - "Continue Learning" — no lesson completed in 48h
 * - "Post a Trade" — no journal entry this week
 * - "Welcome Tasks" — onboarding steps incomplete
 */
export function useSmartNotifications() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;

    async function run() {
      const userId = user!.id;
      const today = new Date().toISOString().slice(0, 10);

      // Don't create more than 1 smart notification per day
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "smart")
        .gte("created_at", `${today}T00:00:00Z`)
        .limit(1);

      if (existing && existing.length > 0) return;

      // --- Check 1: Welcome Tasks (onboarding incomplete) ---
      const { data: onboarding } = await supabase
        .from("onboarding_state")
        .select("claimed_role, first_lesson_completed, intro_posted")
        .eq("user_id", userId)
        .limit(1)
        .single();

      if (onboarding) {
        const steps = [onboarding.claimed_role, onboarding.first_lesson_completed, onboarding.intro_posted];
        const remaining = steps.filter((s) => !s).length;
        if (remaining > 0) {
          await supabase.from("notification_log").insert({
            user_id: userId,
            type: "smart",
            title: "Welcome tasks waiting",
            body: `You have ${remaining} onboarding step${remaining > 1 ? "s" : ""} left. Finish them to unlock your full experience.`,
          } as any);
          return;
        }
      }

      // --- Check 2: Continue Learning (no lesson in 48h) ---
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: recentLessons } = await supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("completed_at", twoDaysAgo)
        .limit(1);

      if (!recentLessons || recentLessons.length === 0) {
        // Only notify if user has started at least one lesson ever
        const { count } = await supabase
          .from("lesson_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (count && count > 0) {
          await supabase.from("notification_log").insert({
            user_id: userId,
            type: "smart",
            title: "Continue learning",
            body: "You haven't watched a lesson in 2 days. Even 5 minutes keeps the momentum going.",
          } as any);
          return;
        }
      }

      // --- Check 3: Post a Trade (no journal entry this week) ---
      const monday = new Date();
      monday.setDate(monday.getDate() - monday.getDay() + (monday.getDay() === 0 ? -6 : 1));
      const mondayStr = monday.toISOString().slice(0, 10);

      const { data: weekJournals } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("user_id", userId)
        .gte("entry_date", mondayStr)
        .limit(1);

      if (!weekJournals || weekJournals.length === 0) {
        // Only notify if user has journaled before
        const { count: totalJournals } = await supabase
          .from("journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (totalJournals && totalJournals > 0) {
          await supabase.from("notification_log").insert({
            user_id: userId,
            type: "smart",
            title: "Post a trade journal",
            body: "No journal entries this week yet. Logging trades builds your edge over time.",
          } as any);
          return;
        }
      }
    }

    run().catch(console.error);
  }, [user]);
}
