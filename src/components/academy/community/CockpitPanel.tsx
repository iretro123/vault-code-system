import { useState, useCallback, useEffect } from "react";
import { useTradeLog } from "@/hooks/useTradeLog";
import { usePlaybookProgress } from "@/hooks/usePlaybookProgress";
import { useNavigate } from "react-router-dom";
import {
  FileText, HelpCircle, Trophy,
  ChevronRight, X, Flame, Radio
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/* ── Your Week ── */
function YourWeekCard() {
  const { entries } = useTradeLog();

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const tradesThisWeek = entries?.filter(
    (e: any) => new Date(e.trade_date) >= startOfWeek
  ).length ?? 0;

  const journalCount = 0;
  const reviewStatus = "Due";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 space-y-2.5">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Your Week</p>
      <div className="space-y-2">
        <MetricRow label="Trades" value={String(tradesThisWeek)} accent={tradesThisWeek > 0} />
        <MetricRow label="Journal" value={String(journalCount)} />
        <MetricRow label="Review" value={reviewStatus} warn={reviewStatus === "Due"} />
      </div>
    </div>
  );
}

function MetricRow({ label, value, accent, warn }: {
  label: string; value: string; accent?: boolean; warn?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn(
        "text-[12px] font-semibold",
        warn ? "text-amber-500" : accent ? "text-emerald-400" : "text-foreground"
      )}>
        {value}
      </span>
    </div>
  );
}

/* ── Live Indicator ── */
function LiveDot({ isLive }: { isLive: boolean }) {
  if (!isLive) {
    return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0" />;
  }
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span
        className="absolute inset-0 rounded-full bg-destructive"
        style={{ animation: "breathe 2s ease-in-out infinite" }}
      />
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
      case "log-trade":
        navigate("/academy/trade");
        break;
      case "ask-question":
        window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
        break;
      case "share-win":
        onSwitchTab?.("wins");
        break;
      case "live":
        navigate("/academy/live");
        break;
    }
  };

  const actions = [
    { key: "log-trade", label: "Log Trade", icon: FileText },
    { key: "ask-question", label: "Ask Question", icon: HelpCircle },
    { key: "share-win", label: "Share a Win", icon: Trophy },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 space-y-2.5">
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
        {/* LIVE row */}
        <button
          onClick={() => handleAction("live")}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-white/[0.06] transition-colors group"
        >
          <LiveDot isLive={isLive} />
          <span className={cn(
            "text-[13px] font-semibold flex-1 transition-colors",
            isLive
              ? "text-destructive"
              : "text-muted-foreground group-hover:text-foreground"
          )}>
            {isLive ? "LIVE" : "Live Sessions"}
          </span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

/* ── Coach Feed ── */
interface CoachItem {
  id: string;
  message: string;
  cta?: string;
  ctaPath?: string;
}

function CoachFeedCard() {
  const navigate = useNavigate();
  const { nextChapter, gatesPassed, completedCount, totalCount } = usePlaybookProgress();
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("vault_coach_dismissed");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const items: CoachItem[] = [];

  // Dynamic playbook nudges
  if (nextChapter && completedCount < totalCount) {
    items.push({
      id: "playbook_continue",
      message: `Continue Playbook: ${nextChapter.title} (${nextChapter.minutes_estimate} min)`,
      cta: "Continue",
      ctaPath: `/academy/playbook?chapter=${nextChapter.id}`,
    });
  }
  if (!gatesPassed && totalCount > 0) {
    items.push({
      id: "unlock_setups",
      message: "You're 1 checkpoint away from unlocking Post Setups.",
      cta: "Open Playbook",
      ctaPath: "/academy/playbook",
    });
  }

  // Static nudges
  items.push(
    { id: "journal_missing", message: "No journal entry yesterday.", cta: "Write now", ctaPath: "/academy/journal" },
    { id: "weekly_review", message: "Weekly review due Sunday 6 PM.", cta: "Review", ctaPath: "/academy/progress" },
    { id: "lesson_incomplete", message: "Module 2 lesson 3 is incomplete.", cta: "Continue", ctaPath: "/academy/learn" },
  );

  const visibleItems = items.filter((it) => !dismissed.has(it.id));

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("vault_coach_dismissed", JSON.stringify([...next]));
      return next;
    });
  }, []);

  if (visibleItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Flame className="h-3 w-3 text-amber-500" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Coach Feed</p>
      </div>
      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-muted-foreground leading-relaxed">{item.message}</p>
              {item.cta && item.ctaPath && (
                <button
                  onClick={() => navigate(item.ctaPath!)}
                  className="text-[11px] text-primary hover:text-primary/80 font-medium mt-1 transition-colors"
                >
                  {item.cta} →
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 opacity-0 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Cockpit Panel ── */
export function CockpitPanel({ onSwitchTab }: { onSwitchTab?: (tab: string) => void }) {
  return (
    <div className="flex flex-col gap-3 p-3.5 h-full overflow-y-auto">
      <YourWeekCard />
      <QuickActionsCard onSwitchTab={onSwitchTab} />
      <CoachFeedCard />
    </div>
  );
}
