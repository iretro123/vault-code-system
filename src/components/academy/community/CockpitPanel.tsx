import { useState, useCallback, useEffect } from "react";
import { useTradeLog } from "@/hooks/useTradeLog";
import { usePlaybookProgress } from "@/hooks/usePlaybookProgress";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  FileText, HelpCircle, Trophy,
  ChevronRight, X, Flame, Radio,
  AlertTriangle, PenLine, ClipboardCheck,
  MessageSquare, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { detectStuck, type StuckSignals } from "@/lib/detectStuck";
import { cn } from "@/lib/utils";

/* ── Progress Ring ── */
function ProgressRing({ value, max, size = 40, stroke = 3.5, color = "hsl(var(--primary))" }: {
  value: number; max: number; size?: number; stroke?: number; color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke}
        opacity={0.25}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease", filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        className="fill-foreground"
        style={{ fontSize: "9px", fontWeight: 700, transform: "rotate(90deg)", transformOrigin: "center" }}
      >
        {value}
      </text>
    </svg>
  );
}

/* ── Luxury Card Wrapper ── */
function LuxuryCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative rounded-xl p-[1px] overflow-hidden", className)}>
      <div
        className="absolute inset-0 rounded-xl opacity-40"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.3), transparent 50%, hsl(var(--primary) / 0.15))",
        }}
      />
      <div className="relative rounded-xl border border-white/[0.06] bg-[hsl(var(--card))] p-3.5 space-y-2.5">
        {children}
      </div>
    </div>
  );
}

/* ── Your Week ── */
function YourWeekCard() {
  const { entries } = useTradeLog();
  const { user } = useAuth();
  const { pct: playbookPct } = usePlaybookProgress();
  const [journalCount, setJournalCount] = useState(0);
  const [streak, setStreak] = useState(0);

  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const tradesThisWeek = entries?.filter(
    (e: any) => new Date(e.trade_date) >= monday
  ).length ?? 0;

  useEffect(() => {
    if (!user) return;
    const startDate = monday.toISOString().slice(0, 10);
    const endDate = sunday.toISOString().slice(0, 10);

    // Fetch journal count + recent journal dates for streak
    Promise.all([
      supabase.from("journal_entries").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("entry_date", startDate).lte("entry_date", endDate),
      supabase.from("journal_entries").select("entry_date")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .limit(30),
    ]).then(([countRes, datesRes]) => {
      setJournalCount(countRes.count ?? 0);
      // Calculate streak
      if (datesRes.data && datesRes.data.length > 0) {
        const uniqueDates = [...new Set(datesRes.data.map((d: any) => d.entry_date))].sort().reverse();
        let s = 0;
        const today = new Date().toISOString().slice(0, 10);
        let checkDate = today;
        for (const d of uniqueDates) {
          if (d === checkDate) {
            s++;
            const prev = new Date(checkDate);
            prev.setDate(prev.getDate() - 1);
            checkDate = prev.toISOString().slice(0, 10);
          } else if (d < checkDate) break;
        }
        setStreak(s);
      }
    });
  }, [user]);

  const TRADE_GOAL = 5;
  const JOURNAL_GOAL = 3;

  return (
    <LuxuryCard>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Your Week</p>
        {streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Flame className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500">{streak}d</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-around pt-1">
        <div className="flex flex-col items-center gap-1">
          <ProgressRing value={tradesThisWeek} max={TRADE_GOAL} color="hsl(var(--primary))" />
          <span className="text-[10px] text-muted-foreground">Trades</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ProgressRing value={journalCount} max={JOURNAL_GOAL} color="hsl(142, 71%, 45%)" />
          <span className="text-[10px] text-muted-foreground">Journal</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ProgressRing value={Math.round(playbookPct / 10)} max={10} color="hsl(271, 91%, 65%)" />
          <span className="text-[10px] text-muted-foreground">Playbook</span>
        </div>
      </div>
    </LuxuryCard>
  );
}

/* ── Live Indicator ── */
function LiveDot({ isLive }: { isLive: boolean }) {
  if (!isLive) {
    return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0" />;
  }
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="absolute inset-0 rounded-full bg-destructive animate-pulse" />
      <span className="relative h-2.5 w-2.5 rounded-full bg-destructive" />
    </span>
  );
}

/* ── Quick Actions ── */
function QuickActionsCard({ onSwitchTab }: { onSwitchTab?: (tab: string) => void }) {
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const now = new Date();
    supabase
      .from("live_sessions")
      .select("id, session_date, duration_minutes")
      .lte("session_date", new Date(now.getTime() + 15 * 60 * 1000).toISOString())
      .gte("session_date", new Date(now.getTime() - 120 * 60 * 1000).toISOString())
      .limit(1)
      .then(({ data }) => setIsLive((data?.length ?? 0) > 0));
  }, []);

  const handleAction = (key: string) => {
    switch (key) {
      case "log-trade": navigate("/academy/trade"); break;
      case "ask-question": window.dispatchEvent(new CustomEvent("toggle-coach-drawer")); break;
      case "share-win": onSwitchTab?.("wins"); break;
      case "live": navigate("/academy/live"); break;
    }
  };

  const actions = [
    { key: "log-trade", label: "Log Trade", icon: FileText },
    { key: "ask-question", label: "Ask Question", icon: HelpCircle },
    { key: "share-win", label: "Share a Win", icon: Trophy },
  ];

  return (
    <LuxuryCard>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Quick Actions</p>
      <div className="space-y-0">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => handleAction(a.key)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-white/[0.06] transition-colors group"
          >
            <a.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
            <span className="text-[13px] text-muted-foreground group-hover:text-foreground flex-1">{a.label}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
          </button>
        ))}
        <button
          onClick={() => handleAction("live")}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-white/[0.06] transition-colors group"
        >
          <LiveDot isLive={isLive} />
          <span className={cn(
            "text-[13px] font-semibold flex-1 transition-colors",
            isLive ? "text-destructive" : "text-muted-foreground group-hover:text-foreground"
          )}>
            {isLive ? "LIVE" : "Live Sessions"}
          </span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
        </button>
      </div>
    </LuxuryCard>
  );
}

/* ── Real Coach Feed ── */
interface CoachNudge {
  id: string;
  message: string;
  cta?: string;
  ctaAction?: string;
  icon: typeof AlertTriangle;
  accent: "red" | "amber" | "blue" | "purple";
}

const ACCENT_STYLES = {
  red: { bar: "bg-destructive", iconColor: "text-destructive" },
  amber: { bar: "bg-amber-500", iconColor: "text-amber-500" },
  blue: { bar: "bg-primary", iconColor: "text-primary" },
  purple: { bar: "bg-purple-500", iconColor: "text-purple-500" },
};

function RealCoachFeedCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { nextChapter, completedCount, totalCount, gatesPassed } = usePlaybookProgress();
  const [nudges, setNudges] = useState<CoachNudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("vault_coach_dismissed_v2");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    buildNudges(user.id).then((items) => {
      if (!cancelled) {
        setNudges(items);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user]);

  // Add playbook nudges
  const allNudges = [...nudges];
  if (nextChapter && completedCount < totalCount) {
    allNudges.push({
      id: "playbook_continue",
      message: `Continue: ${nextChapter.title} (${nextChapter.minutes_estimate} min)`,
      cta: "Continue",
      ctaAction: `/academy/playbook?chapter=${nextChapter.id}`,
      icon: BookOpen,
      accent: "purple",
    });
  }
  if (!gatesPassed && totalCount > 0) {
    allNudges.push({
      id: "unlock_setups",
      message: "1 checkpoint away from unlocking Post Setups.",
      cta: "Open Playbook",
      ctaAction: "/academy/playbook",
      icon: BookOpen,
      accent: "blue",
    });
  }

  const visibleNudges = allNudges.filter((n) => !dismissed.has(n.id));

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("vault_coach_dismissed_v2", JSON.stringify([...next]));
      return next;
    });
  }, []);

  return (
    <LuxuryCard>
      <div className="flex items-center gap-1.5">
        <Flame className="h-3 w-3 text-amber-500 animate-pulse" style={{ filter: "drop-shadow(0 0 6px hsl(38, 92%, 50%))" }} />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Coach Feed</p>
      </div>

      {loading ? (
        <div className="py-4 text-center">
          <span className="text-[11px] text-muted-foreground animate-pulse">Scanning...</span>
        </div>
      ) : visibleNudges.length === 0 ? (
        <p className="text-[12px] text-muted-foreground/60 py-2">All clear. Stay disciplined.</p>
      ) : (
        <div className="space-y-1.5">
          {visibleNudges.map((item, i) => {
            const styles = ACCENT_STYLES[item.accent];
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden group animate-fade-in"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                {/* Accent bar */}
                <div className={cn("w-[3px] self-stretch shrink-0 rounded-l-xl", styles.bar)} />
                <div className="flex items-start gap-2 flex-1 min-w-0 px-2 py-2.5">
                  <item.icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", styles.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{item.message}</p>
                    {item.cta && item.ctaAction && (
                      <button
                        onClick={() => {
                          if (item.ctaAction === "coach") {
                            window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
                          } else {
                            navigate(item.ctaAction!);
                          }
                        }}
                        className="text-[11px] text-primary hover:text-primary/80 font-medium mt-1 transition-colors"
                      >
                        {item.cta} →
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss(item.id)}
                    className="p-0.5 rounded text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LuxuryCard>
  );
}

async function buildNudges(userId: string): Promise<CoachNudge[]> {
  const items: CoachNudge[] = [];
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const twoDaysAgoDate = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [stuckSignals, journalYesterdayRes, checkinTodayRes, coachRepliesRes] = await Promise.all([
    detectStuck(userId),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("entry_date", yesterday),
    supabase
      .from("vault_daily_checklist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("date", todayDate),
    supabase
      .from("coach_ticket_replies")
      .select("id")
      .eq("is_admin", true)
      .gte("created_at", twoDaysAgoDate)
      .limit(3),
  ]);

  // Urgent: repeated losses
  if (stuckSignals.recentLosses) {
    items.push({
      id: "stuck_losses",
      message: "Repeated losses detected. Pause and review your process.",
      cta: "Review",
      ctaAction: "/academy/journal",
      icon: AlertTriangle,
      accent: "red",
    });
  }

  // Trades without journal
  if (stuckSignals.inactive) {
    items.push({
      id: "trades_no_journal",
      message: "You traded recently but didn't journal. Logging builds awareness.",
      cta: "Journal",
      ctaAction: "/academy/journal",
      icon: PenLine,
      accent: "amber",
    });
  }

  // Missing yesterday's journal
  if ((journalYesterdayRes.count ?? 0) === 0) {
    items.push({
      id: "journal_yesterday",
      message: "No journal entry yesterday. Stay accountable.",
      cta: "Write now",
      ctaAction: "/academy/journal",
      icon: PenLine,
      accent: "amber",
    });
  }

  // Missing daily check-in
  if ((checkinTodayRes.count ?? 0) === 0) {
    items.push({
      id: "checkin_today",
      message: "Daily check-in pending. 30 seconds to confirm your rules.",
      cta: "Check in",
      ctaAction: "/academy/home#checkin",
      icon: ClipboardCheck,
      accent: "blue",
    });
  }

  // Coach replies
  if (coachRepliesRes.data && coachRepliesRes.data.length > 0) {
    items.push({
      id: "coach_reply",
      message: "Your mentor responded. Review their feedback.",
      cta: "Open",
      ctaAction: "coach",
      icon: MessageSquare,
      accent: "blue",
    });
  }

  return items.slice(0, 5);
}

/* ── Main Cockpit Panel ── */
export function CockpitPanel({ onSwitchTab }: { onSwitchTab?: (tab: string) => void }) {
  return (
    <div className="flex flex-col gap-3 p-3.5 h-full overflow-y-auto">
      <YourWeekCard />
      <QuickActionsCard onSwitchTab={onSwitchTab} />
      <RealCoachFeedCard />
    </div>
  );
}
