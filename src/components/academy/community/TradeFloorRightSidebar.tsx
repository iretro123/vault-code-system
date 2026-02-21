import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTradeLog } from "@/hooks/useTradeLog";
import { useNavigate } from "react-router-dom";
import { 
  FileText, HelpCircle, ClipboardCheck, BookOpen, 
  ChevronRight, X, AlertCircle, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Your Week card ── */
function YourWeekCard() {
  const { entries } = useTradeLog();
  
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const tradesThisWeek = entries?.filter(
    (e: any) => new Date(e.trade_date) >= startOfWeek
  ).length ?? 0;

  // Stub values — these would come from real data in Phase 2
  const journalCount = 0;
  const reviewStatus = "Due";

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
      <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em]">Your Week</p>
      <div className="space-y-2.5">
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
      <span className="text-[13px] text-white/40">{label}</span>
      <span className={cn(
        "text-[13px] font-semibold",
        warn ? "text-amber-400/80" : accent ? "text-emerald-400/80" : "text-white/60"
      )}>
        {value}
      </span>
    </div>
  );
}

/* ── Quick Actions card ── */
function QuickActionsCard() {
  const navigate = useNavigate();

  const actions = [
    { label: "Log Trade", icon: FileText, path: "/academy/trade" },
    { label: "Ask Question", icon: HelpCircle, path: null, action: "coach" },
    { label: "Weekly Review", icon: ClipboardCheck, path: "/academy/progress" },
    { label: "Mentor Setups", icon: BookOpen, path: "/academy/learn" },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
      <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em]">Quick Actions</p>
      <div className="space-y-1">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => a.path && navigate(a.path)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.04] transition-colors group"
          >
            <a.icon className="h-3.5 w-3.5 text-white/25 group-hover:text-white/50 shrink-0" />
            <span className="text-[13px] text-white/50 group-hover:text-white/80 flex-1">{a.label}</span>
            <ChevronRight className="h-3 w-3 text-white/15 group-hover:text-white/30" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Coach Feed card ── */

interface CoachItem {
  id: string;
  type: string;
  message: string;
  icon: typeof AlertCircle;
}

function CoachFeedCard() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("vault_coach_dismissed");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const items: CoachItem[] = [
    { id: "journal_missing", type: "nudge", message: "You didn't journal yesterday.", icon: AlertCircle },
    { id: "weekly_review", type: "reminder", message: "Weekly review due Sunday 6 PM.", icon: ClipboardCheck },
    { id: "lesson_incomplete", type: "progress", message: "Module 2 lesson 3 is incomplete.", icon: BookOpen },
  ];

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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Flame className="h-3 w-3 text-amber-400/50" />
        <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em]">Coach Feed</p>
      </div>
      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] group"
          >
            <item.icon className="h-3.5 w-3.5 text-amber-400/40 shrink-0 mt-0.5" />
            <p className="text-[12px] text-white/50 leading-relaxed flex-1">{item.message}</p>
            <button
              onClick={() => dismiss(item.id)}
              className="p-0.5 rounded text-white/15 hover:text-white/40 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Right Sidebar ── */
export function TradeFloorRightSidebar() {
  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      <YourWeekCard />
      <QuickActionsCard />
      <CoachFeedCard />
    </div>
  );
}
