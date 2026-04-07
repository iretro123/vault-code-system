import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatTimeInTZ, getUserTimezone } from "@/lib/userTime";

type StatusKey = "streak" | "missed_journal" | "live_tonight" | "weekly_review" | "default";

interface StatusMessage {
  key: StatusKey;
  text: string;
  priority: number;
}

export function DashboardStatusLine() {
  const { user, profile } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const tz = getUserTimezone(profile?.timezone);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    resolveStatus(user.id, tz).then((msg) => {
      if (!cancelled) setMessage(msg);
    });

    return () => { cancelled = true; };
  }, [user, tz]);

  if (!message) return null;

  return (
    <p className="text-sm text-muted-foreground mt-1.5">{message}</p>
  );
}

async function resolveStatus(userId: string, tz: string): Promise<string> {
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const mondayDate = monday.toISOString().slice(0, 10);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [journalRes, liveRes, weeklyRes, streakRes] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("entry_date", mondayDate),
    supabase
      .from("live_sessions")
      .select("id, title, session_date")
      .gte("session_date", now.toISOString())
      .lte("session_date", endOfTomorrow.toISOString())
      .order("session_date", { ascending: true })
      .limit(1),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("entry_date", mondayDate),
    supabase
      .from("vault_daily_checklist")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7),
  ]);

  const messages: StatusMessage[] = [];

  // Live session
  if (liveRes.data && liveRes.data.length > 0) {
    const session = liveRes.data[0];
    const sessionDate = new Date(session.session_date);
    const isToday = sessionDate <= endOfToday;
    const hourStr = sessionDate.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false });
    const hourNum = parseInt(hourStr, 10);
    const timeStr = formatTimeInTZ(session.session_date, tz);

    let label: string;
    if (!isToday) {
      label = `Live session tomorrow at ${timeStr}`;
    } else if (hourNum < 12) {
      label = `Live session today at ${timeStr}`;
    } else if (hourNum < 17) {
      label = `Live session this afternoon at ${timeStr}`;
    } else {
      label = `Live session tonight at ${timeStr}`;
    }
    messages.push({
      key: "live_tonight",
      text: `${label} — "${session.title}"`,
      priority: 1,
    });
  }

  // Missed journal
  if ((journalRes.count ?? 0) === 0) {
    messages.push({
      key: "missed_journal",
      text: "No journal entries this week. Log a trade to stay accountable.",
      priority: 2,
    });
  }

  // Weekly review due (Friday+)
  const dayOfWeek = now.getDay();
  if (dayOfWeek >= 5 || dayOfWeek === 0) {
    if ((weeklyRes.count ?? 0) === 0) {
      messages.push({
        key: "weekly_review",
        text: "Weekly review is due. Reflect before the week resets.",
        priority: 3,
      });
    }
  }

  // Streak
  if (streakRes.data && streakRes.data.length >= 3) {
    const streak = streakRes.data.length;
    messages.push({
      key: "streak",
      text: `${streak}-day check-in streak active. Keep it going.`,
      priority: 4,
    });
  }

  if (messages.length === 0) {
    return "Your trading discipline journey continues";
  }

  messages.sort((a, b) => a.priority - b.priority);
  return messages[0].text;
}
