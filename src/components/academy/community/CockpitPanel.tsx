import { useState, useCallback } from "react";
import { useTradeLog } from "@/hooks/useTradeLog";
import { usePlaybookProgress } from "@/hooks/usePlaybookProgress";
import { useNavigate } from "react-router-dom";
import {
  FileText, HelpCircle, ClipboardCheck, BookOpen,
  ChevronRight, X, Flame, Target
} from "lucide-react";
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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Your Week</p>
      <div className="space-y-2">
        <MetricRow label="Trades Logged" value={String(tradesThisWeek)} accent={tradesThisWeek > 0} />
        <MetricRow label="Journal Entries" value={String(journalCount)} />
        <MetricRow label="Weekly Review" value={reviewStatus} warn={reviewStatus === "Due"} />
      </div>
    </div>
  );
}

function MetricRow({ label, value, accent, warn }: {
  label: string; value: string; accent?: boolean; warn?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-white/35">{label}</span>
      <span className={cn(
        "text-[13px] font-semibold",
        warn ? "text-amber-400/70" : accent ? "text-emerald-400/70" : "text-white/50"
      )}>
        {value}
      </span>
    </div>
  );
}

/* ── Quick Actions ── */
function QuickActionsCard() {
  const navigate = useNavigate();

  const actions = [
    { label: "Post Setup", icon: Target, path: "/academy/trade" },
    { label: "Log Trade", icon: FileText, path: "/academy/trade" },
    { label: "Ask Question", icon: HelpCircle, path: null },
    { label: "Weekly Review", icon: ClipboardCheck, path: "/academy/progress" },
    { label: "Mentor Setups", icon: BookOpen, path: "/academy/learn" },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Quick Actions</p>
      <div className="space-y-0.5">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => a.path && navigate(a.path)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.03] transition-colors group"
          >
            <a.icon className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 shrink-0" />
            <span className="text-[13px] text-white/45 group-hover:text-white/70 flex-1">{a.label}</span>
            <ChevronRight className="h-3 w-3 text-white/10 group-hover:text-white/25" />
          </button>
        ))}
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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Flame className="h-3 w-3 text-amber-400/40" />
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Coach Feed</p>
      </div>
      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white/[0.015] border border-white/[0.03] group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white/45 leading-relaxed">{item.message}</p>
              {item.cta && item.ctaPath && (
                <button
                  onClick={() => navigate(item.ctaPath!)}
                  className="text-[11px] text-primary/70 hover:text-primary font-medium mt-1 transition-colors"
                >
                  {item.cta} →
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(item.id)}
              className="p-0.5 rounded text-white/10 hover:text-white/30 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
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
export function CockpitPanel() {
  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-hidden">
      <YourWeekCard />
      <QuickActionsCard />
      <CoachFeedCard />
    </div>
  );
}
