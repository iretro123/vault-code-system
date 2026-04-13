import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, BookOpen, Trophy, Video, PenLine,
  Flame, CheckCircle2, X, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Nudge {
  key: string;
  icon: React.ElementType;
  message: string;
  cta?: string;
  route?: string;
  action?: string;
  accent: "amber" | "emerald" | "blue";
}

const DISMISS_PREFIX = "va_nudge_dismiss_";

function getDismissKey(nudgeKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `${DISMISS_PREFIX}${nudgeKey}_${today}`;
}

export function PersonalNudgeCard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;

    resolveNudge(user.id, profile.created_at).then((n) => {
      if (cancelled) return;
      if (n && localStorage.getItem(getDismissKey(n.key))) {
        setNudge(null);
      } else {
        setNudge(n);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user, profile]);

  const handleCta = () => {
    if (!nudge) return;
    if (nudge.action === "checkin") {
      window.dispatchEvent(new CustomEvent("open-checkin"));
    } else if (nudge.route) {
      navigate(nudge.route);
    }
  };

  const handleDismiss = () => {
    if (nudge) localStorage.setItem(getDismissKey(nudge.key), "1");
    setDismissed(true);
  };

  if (loading || !nudge || dismissed) return null;

  const Icon = nudge.icon;
  const accentMap = {
    amber: "border-l-amber-500/70 bg-amber-500/[0.04]",
    emerald: "border-l-emerald-500/70 bg-emerald-500/[0.04]",
    blue: "border-l-primary/70 bg-primary/[0.04]",
  };
  const iconColorMap = {
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    blue: "text-primary",
  };

  return (
    <div
      className={cn(
        "vault-luxury-card border-l-[3px] px-4 py-3.5 flex items-center gap-3.5 animate-fade-in",
        accentMap[nudge.accent]
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", iconColorMap[nudge.accent])} />
      <p className="text-sm text-muted-foreground leading-snug flex-1 min-w-0">
        {nudge.message}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        {nudge.cta && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 h-8 px-3 text-xs font-semibold hover:bg-white/5"
            onClick={handleCta}
          >
            {nudge.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
        <button
          onClick={handleDismiss}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

async function resolveNudge(userId: string, memberSince: string): Promise<Nudge | null> {
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const mondayDate = monday.toISOString().slice(0, 10);
  const dayOfWeek = now.getDay();

  const [checkinRes, tradesTodayRes, tradesAllRes, journalRes, lessonsRes, winsRes, liveRes] = await Promise.all([
    // Last 14 check-in dates
    supabase
      .from("vault_daily_checklist")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(14),
    // Trades today
    supabase
      .from("trade_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("trade_date", todayDate),
    // All trades
    supabase
      .from("trade_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    // Journal this week
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("entry_date", mondayDate),
    // Lessons completed
    supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true),
    // Wins posted (messages in wins-proof room)
    supabase
      .from("academy_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("room_slug", "wins-proof"),
    // Live attendance
    supabase
      .from("live_session_attendance")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  // Compute streak & days inactive
  const checkinDates = (checkinRes.data || []).map((r) => r.date as string);
  let streak = 0;
  if (checkinDates.length > 0) {
    const d = new Date(todayDate);
    for (let i = 0; i < checkinDates.length; i++) {
      const expected = new Date(d);
      expected.setDate(d.getDate() - i);
      if (checkinDates[i] === expected.toISOString().slice(0, 10)) {
        streak++;
      } else {
        break;
      }
    }
  }

  const lastCheckin = checkinDates[0];
  let daysInactive = 999;
  if (lastCheckin) {
    daysInactive = Math.floor(
      (now.getTime() - new Date(lastCheckin).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  const tradesToday = tradesTodayRes.count ?? 0;
  const totalTrades = tradesAllRes.count ?? 0;
  const journalsThisWeek = journalRes.count ?? 0;
  const lessonsCompleted = lessonsRes.count ?? 0;
  const winsPosted = winsRes.count ?? 0;
  const liveAttended = liveRes.count ?? 0;
  const checkedInToday = checkinDates.includes(todayDate);

  const memberDays = Math.floor(
    (now.getTime() - new Date(memberSince).getTime()) / (1000 * 60 * 60 * 24)
  );
  const memberWeeks = Math.max(1, Math.floor(memberDays / 7));

  // Priority waterfall
  // 1. Inactive 3+ days
  if (daysInactive >= 3) {
    return {
      key: "inactive",
      icon: AlertTriangle,
      message: `You've been away ${daysInactive} days. Your streak reset — start a new one today.`,
      cta: "Check In",
      action: "checkin",
      accent: "amber",
    };
  }

  // 2. Traded today, no journal
  if (tradesToday > 0 && journalsThisWeek === 0) {
    return {
      key: "trade_no_journal",
      icon: PenLine,
      message: `You traded ${tradesToday} time${tradesToday > 1 ? "s" : ""} today but haven't journaled. Don't lose the insight.`,
      cta: "Open Journal",
      route: "/academy/journal",
      accent: "amber",
    };
  }

  // 3. No check-in today
  if (!checkedInToday) {
    return {
      key: "no_checkin",
      icon: CheckCircle2,
      message: "You haven't checked in today. 30 seconds to stay accountable.",
      cta: "Check In",
      action: "checkin",
      accent: "blue",
    };
  }

  // 4. No wins posted (but has 3+ trades)
  if (totalTrades >= 3 && winsPosted === 0) {
    return {
      key: "no_wins",
      icon: Trophy,
      message: `You've logged ${totalTrades} trades but haven't shared a win yet. Post one — your progress inspires others.`,
      cta: "Share Win",
      route: "/academy/community?tab=wins",
      accent: "blue",
    };
  }

  // 5. Lessons watched but no trades (5+ lessons, 0 trades)
  if (lessonsCompleted >= 5 && totalTrades === 0) {
    return {
      key: "lessons_no_trades",
      icon: BookOpen,
      message: `You've completed ${lessonsCompleted} lessons. Time to apply — log your first trade.`,
      cta: "Log Trade",
      route: "/academy/trade",
      accent: "blue",
    };
  }

  // 6. No live session attended (member 14+ days)
  if (memberDays >= 14 && liveAttended === 0) {
    return {
      key: "no_live",
      icon: Video,
      message: `You've been here ${memberWeeks} week${memberWeeks > 1 ? "s" : ""} and haven't joined a live session yet.`,
      cta: "Go to Live",
      route: "/academy/live",
      accent: "blue",
    };
  }

  // 7. Weekly review due (Fri–Sun, no journal this week)
  if ((dayOfWeek >= 5 || dayOfWeek === 0) && journalsThisWeek === 0) {
    return {
      key: "weekly_review",
      icon: PenLine,
      message: "End of week. Write 1 journal entry before Monday.",
      cta: "Start Review",
      route: "/academy/journal",
      accent: "amber",
    };
  }

  // 8. On a streak (3+ days)
  if (streak >= 3) {
    return {
      key: "streak",
      icon: Flame,
      message: `${streak}-day check-in streak. Keep building.`,
      accent: "emerald",
    };
  }

  // 9. All caught up
  return {
    key: "caught_up",
    icon: CheckCircle2,
    message: "You're on track today. Come back tomorrow to keep building.",
    accent: "emerald",
  };
}
