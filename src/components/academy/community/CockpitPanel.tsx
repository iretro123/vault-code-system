import { useState, useCallback } from "react";
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
    <div className="rounded-xl border border-[hsl(220,10%,82%)] bg-white p-3.5 space-y-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <p className="text-[10px] font-bold text-[hsl(220,10%,40%)] uppercase tracking-[0.12em]">Your Week</p>
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
      <span className="text-[12px] text-[hsl(220,10%,45%)]">{label}</span>
      <span className={cn(
        "text-[12px] font-semibold",
        warn ? "text-amber-600" : accent ? "text-emerald-600" : "text-[hsl(220,10%,25%)]"
      )}>
        {value}
      </span>
    </div>
  );
}

/* ── Quick Actions ── */
function QuickActionsCard({ onSwitchTab }: { onSwitchTab?: (tab: string) => void }) {
  const navigate = useNavigate();

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
      case "weekly-review":
        navigate("/academy/progress");
        break;
    }
  };

  const actions = [
    { key: "log-trade", label: "Log Trade", icon: FileText },
    { key: "ask-question", label: "Ask Question", icon: HelpCircle },
    { key: "share-win", label: "Share a Win", icon: Trophy },
    { key: "weekly-review", label: "Weekly Review", icon: ClipboardCheck },
  ];

  return (
    <div className="rounded-xl border border-[hsl(220,10%,82%)] bg-white p-3.5 space-y-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <p className="text-[10px] font-bold text-[hsl(220,10%,40%)] uppercase tracking-[0.12em]">Quick Actions</p>
      <div className="space-y-0">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => handleAction(a.key)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-[hsl(220,10%,95%)] transition-colors group"
          >
            <a.icon className="h-3.5 w-3.5 text-[hsl(220,10%,55%)] group-hover:text-[hsl(220,10%,35%)] shrink-0" />
            <span className="text-[13px] text-[hsl(220,10%,40%)] group-hover:text-[hsl(220,10%,20%)] flex-1">{a.label}</span>
            <ChevronRight className="h-3 w-3 text-[hsl(220,10%,70%)] group-hover:text-[hsl(220,10%,45%)]" />
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
    <div className="rounded-xl border border-[hsl(220,10%,82%)] bg-white p-3.5 space-y-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-1.5">
        <Flame className="h-3 w-3 text-amber-500" />
        <p className="text-[10px] font-bold text-[hsl(220,10%,40%)] uppercase tracking-[0.15em]">Coach Feed</p>
      </div>
      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[hsl(220,10%,96%)] border border-[hsl(220,10%,88%)] group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[hsl(220,10%,35%)] leading-relaxed">{item.message}</p>
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
              className="p-0.5 rounded text-[hsl(220,10%,70%)] hover:text-[hsl(220,10%,40%)] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
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
