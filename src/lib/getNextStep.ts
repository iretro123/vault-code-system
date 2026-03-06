import { supabase } from "@/integrations/supabase/client";

export interface NextStep {
  title: string;
  description: string;
  cta_label: string;
  cta_route: string;
}

interface UserContext {
  userId: string;
  onboardingComplete: boolean;
  profileComplete: boolean;
}

const todayDate = () => new Date().toISOString().slice(0, 10);

export async function getNextStep(ctx: UserContext): Promise<NextStep> {
  // 1) Onboarding incomplete
  if (!ctx.onboardingComplete) {
    return {
      title: "Finish Setup",
      description: "Complete your profile to unlock the full academy.",
      cta_label: "Continue Setup",
      cta_route: "/academy/home",
    };
  }

  // 2) No daily check-in today
  const { count: checkinCount } = await supabase
    .from("vault_daily_checklist")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .eq("date", todayDate());

  if ((checkinCount ?? 0) === 0) {
    return {
      title: "Daily Check-In",
      description: "30 seconds. Log your rules and trades for today.",
      cta_label: "Check In Now",
      cta_route: "/academy/home#checkin",
    };
  }

  // 3) Traded today but no journal today
  const [{ count: tradesCount }, { count: journalCount }] = await Promise.all([
    supabase
      .from("trade_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .eq("trade_date", todayDate()),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .eq("entry_date", todayDate()),
  ]);

  if ((tradesCount ?? 0) > 0 && (journalCount ?? 0) === 0) {
    return {
      title: "Log Today's Trade",
      description: "You traded today. Journal it before you forget.",
      cta_label: "Open Journal",
      cta_route: "/academy/journal",
    };
  }

  // 4) Next lesson not completed
  const { data: lessons } = await supabase
    .from("academy_lessons")
    .select("id")
    .order("sort_order", { ascending: true })
    .limit(50);

  if (lessons && lessons.length > 0) {
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", ctx.userId)
      .eq("completed", true);

    const completedIds = new Set((progress ?? []).map((p) => p.lesson_id));
    const nextLesson = lessons.find((l) => !completedIds.has(l.id));

    if (nextLesson) {
      return {
        title: "Watch Next Lesson",
        description: "Pick up where you left off. Consistency builds mastery.",
        cta_label: "Continue Learning",
        cta_route: "/academy/learn",
      };
    }
  }

  // 5) Weekly review due (no journal entry this week)
  const monday = new Date();
  monday.setDate(monday.getDate() - monday.getDay() + (monday.getDay() === 0 ? -6 : 1));
  const { count: weeklyJournalCount } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .gte("entry_date", monday.toISOString().slice(0, 10));

  if ((weeklyJournalCount ?? 0) === 0) {
    return {
      title: "Weekly Review",
      description: "Reflect on your week. One entry keeps you accountable.",
      cta_label: "Start Review",
      cta_route: "/academy/journal",
    };
  }

  // 6) Live session within 24h
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: liveSessions } = await supabase
    .from("live_sessions")
    .select("id, title")
    .gte("session_date", now.toISOString())
    .lte("session_date", tomorrow.toISOString())
    .order("session_date", { ascending: true })
    .limit(1);

  if (liveSessions && liveSessions.length > 0) {
    return {
      title: "Join Live Session",
      description: `"${liveSessions[0].title}" starts within 24 hours.`,
      cta_label: "Go to Live",
      cta_route: "/academy/live",
    };
  }

  // 7) Default
  return {
    title: "Continue Learning",
    description: "Stay consistent. One lesson per week builds mastery.",
    cta_label: "Browse Lessons",
    cta_route: "/academy/learn",
  };
}
