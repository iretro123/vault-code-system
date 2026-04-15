import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, BookOpen, Trophy, Video, PenLine,
  Flame, CheckCircle2, X, ArrowRight, Zap, Check
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
  showDone?: boolean;
}

const DISMISS_PREFIX = "va_nudge_dismiss_";

function getDismissKey(nudgeKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `${DISMISS_PREFIX}${nudgeKey}_${today}`;
}

export function PersonalNudgeCard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [resolving, setResolving] = useState(false);

  const resolve = useCallback(async () => {
    if (!user) return;
    const memberSince = user.created_at || new Date().toISOString();
    const n = await resolveNudge(user.id, memberSince);
    if (n && localStorage.getItem(getDismissKey(n.key))) {
      setNudge(null);
    } else {
      setNudge(n);
    }
    setLoading(false);
    setResolving(false);
    setDismissed(false);
  }, [user]);

  // Initial load + re-resolve when route changes back to dashboard
  useEffect(() => {
    resolve();
  }, [resolve, location.pathname]);

  // Auto-refresh when tab becomes visible again
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") resolve();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [resolve]);

  const handleCta = () => {
    if (!nudge) return;
    if (nudge.action === "checkin") {
      window.dispatchEvent(new CustomEvent("open-checkin"));
    } else if (nudge.route) {
      navigate(nudge.route);
    }
  };

  const handleDone = async () => {
    if (!nudge) return;
    setResolving(true);
    // Mark this specific nudge as dismissed for today so it won't reappear
    localStorage.setItem(getDismissKey(nudge.key), "1");
    // Re-resolve to show the next nudge in the waterfall
    await resolve();
  };

  const handleDismiss = () => {
    if (nudge) localStorage.setItem(getDismissKey(nudge.key), "1");
    setDismissed(true);
  };

  if (loading || !nudge || dismissed) return null;

  const Icon = nudge.icon;

  const accentStyles = {
    amber: {
      bar: "from-amber-500 to-amber-600",
      glow: "bg-amber-500/10 ring-1 ring-amber-500/20",
      icon: "text-amber-400",
      btn: "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/20",
      doneBtn: "text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10",
    },
    emerald: {
      bar: "from-emerald-400 to-emerald-600",
      glow: "bg-emerald-500/10 ring-1 ring-emerald-500/20",
      icon: "text-emerald-400",
      btn: "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/20",
      doneBtn: "text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10",
    },
    blue: {
      bar: "from-primary to-blue-600",
      glow: "bg-primary/10 ring-1 ring-primary/20",
      icon: "text-primary",
      btn: "bg-primary/15 text-blue-300 hover:bg-primary/25 border border-primary/20",
      doneBtn: "text-blue-400/70 hover:text-blue-300 hover:bg-primary/10",
    },
  };

  const s = accentStyles[nudge.accent];

  return (
    <div
      className={cn(
        "vault-luxury-card overflow-hidden flex items-stretch animate-fade-in",
        "relative"
      )}
    >
      <div className={cn("w-[3px] shrink-0 bg-gradient-to-b rounded-l-2xl", s.bar)} />

      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3.5 px-4 py-3.5 flex-1 min-w-0">
        <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", s.glow)}>
            <Icon className={cn("h-[18px] w-[18px]", s.icon)} />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1 min-w-0">
            {nudge.message}
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
          {nudge.cta && (
            <Button
              size="sm"
              variant="ghost"
              className={cn("gap-1.5 h-8 px-3.5 text-xs font-semibold rounded-lg", s.btn)}
              onClick={handleCta}
            >
              {nudge.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {nudge.showDone !== false && nudge.cta && (
            <Button
              size="sm"
              variant="ghost"
              disabled={resolving}
              className={cn("gap-1 h-8 px-2.5 text-xs font-medium rounded-lg", s.doneBtn)}
              onClick={handleDone}
            >
              <Check className="h-3.5 w-3.5" />
              Done
            </Button>
          )}
          <button
            onClick={handleDismiss}
            className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
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
    supabase
      .from("vault_daily_checklist")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(14),
    supabase
      .from("trade_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("trade_date", todayDate),
    supabase
      .from("trade_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("entry_date", mondayDate),
    supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true),
    supabase
      .from("academy_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("room_slug", "wins-proof"),
    supabase
      .from("live_session_attendance")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const checkinDates = (checkinRes.data || []).map((r) => r.date as string);
  const hasEverCheckedIn = checkinDates.length > 0;

  let streak = 0;
  if (hasEverCheckedIn) {
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

  let daysInactive = 0;
  if (hasEverCheckedIn) {
    daysInactive = Math.floor(
      (now.getTime() - new Date(checkinDates[0]).getTime()) / (1000 * 60 * 60 * 24)
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

  // ── PRIORITY WATERFALL ──

  if (!hasEverCheckedIn) {
    return {
      key: "never_checkin", icon: Zap,
      message: "Your first check-in takes 30 seconds. Every disciplined trader starts here.",
      cta: "Start Now", action: "checkin", accent: "blue", showDone: false,
    };
  }

  if (daysInactive >= 3) {
    return {
      key: "inactive", icon: AlertTriangle,
      message: `It's been ${daysInactive} days. The market doesn't wait — neither should your discipline.`,
      cta: "Check In", action: "checkin", accent: "amber", showDone: false,
    };
  }

  if (tradesToday > 0 && journalsThisWeek === 0) {
    return {
      key: "trade_no_journal", icon: PenLine,
      message: `You took ${tradesToday} trade${tradesToday > 1 ? "s" : ""} today. Journal it while the lessons are fresh.`,
      cta: "Open Journal", route: "/academy/journal", accent: "amber",
    };
  }

  if (!checkedInToday) {
    return {
      key: "no_checkin", icon: CheckCircle2,
      message: "You haven't checked in today. 30 seconds to stay accountable.",
      cta: "Check In", action: "checkin", accent: "blue", showDone: false,
    };
  }

  if (lessonsCompleted === 0 && memberDays >= 3) {
    return {
      key: "never_lesson", icon: BookOpen,
      message: "You haven't started a lesson yet. The first one is 10 minutes.",
      cta: "Watch Lesson 1", route: "/academy/learn", accent: "blue",
    };
  }

  if (totalTrades >= 3 && winsPosted === 0) {
    return {
      key: "no_wins", icon: Trophy,
      message: `${totalTrades} trades logged, zero wins shared. Post one — your progress inspires others.`,
      cta: "Share Win", route: "/academy/community?tab=wins", accent: "blue",
    };
  }

  if (lessonsCompleted >= 5 && totalTrades === 0) {
    return {
      key: "lessons_no_trades", icon: BookOpen,
      message: `${lessonsCompleted} lessons done, zero trades logged. Time to apply what you've learned.`,
      cta: "Log Trade", route: "/academy/trade", accent: "blue",
    };
  }

  if (memberDays >= 14 && liveAttended === 0) {
    return {
      key: "no_live", icon: Video,
      message: `${memberWeeks} week${memberWeeks > 1 ? "s" : ""} in and no live session yet. Show up once — it changes everything.`,
      cta: "Go to Live", route: "/academy/live", accent: "blue",
    };
  }

  if ((dayOfWeek >= 5 || dayOfWeek === 0) && journalsThisWeek === 0) {
    return {
      key: "weekly_review", icon: PenLine,
      message: "End of week. Write 1 journal entry before Monday.",
      cta: "Start Review", route: "/academy/journal", accent: "amber",
    };
  }

  if (streak >= 3) {
    return {
      key: "streak", icon: Flame,
      message: `${streak}-day streak. You're in the top discipline tier. Don't break it.`,
      accent: "emerald", showDone: false,
    };
  }

  return {
    key: "caught_up", icon: CheckCircle2,
    message: "You're on track today. Come back tomorrow to keep building.",
    accent: "emerald", showDone: false,
  };
}
