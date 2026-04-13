import { useState, useMemo, useEffect, useCallback } from "react";
import { Check, ChevronRight, Rocket, BookOpen, MessageSquare, Shield, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { hapticLight, playCheckSound } from "@/lib/nativeFeedback";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onCheckIn: () => void;
  onClaimRole?: () => void;
}

interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  route?: string;
}

interface TaskGroup {
  title: string;
  tasks: TaskItem[];
}

const LS_KEY = "va_gameplan_completed";
const LS_RESET_KEY = "va_gameplan_last_reset";
const LS_DISMISSED_KEY = "va_gameplan_dismissed";
const RESET_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function loadCompleted(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    const lastReset = localStorage.getItem(LS_RESET_KEY);
    const now = Date.now();
    if (!lastReset || now - new Date(lastReset).getTime() >= RESET_INTERVAL_MS) {
      const filtered = Object.fromEntries(
        Object.entries(map).filter(([id]) => id.startsWith("foundation-"))
      );
      localStorage.setItem(LS_KEY, JSON.stringify(filtered));
      localStorage.setItem(LS_RESET_KEY, new Date().toISOString());
      return filtered;
    }
    return map;
  } catch {
    return {};
  }
}

const TASK_ICONS: Record<string, typeof Rocket> = {
  "foundation-claim-role": Rocket,
  "foundation-introduce": MessageSquare,
  "foundation-first-lesson": BookOpen,
  "foundation-risk-rules": Shield,
  "foundation-starting-balance": Wallet,
};

const TASK_DESCRIPTIONS: Record<string, string> = {
  "foundation-claim-role": "Set your experience level to personalize your path",
  "foundation-introduce": "Say hello in the Trading Floor community",
  "foundation-first-lesson": "Your first lesson is only 10 minutes",
  "foundation-risk-rules": "Define your daily loss and trade limits",
  "foundation-starting-balance": "Enter your account balance to track progress",
};

const TASK_CTA: Record<string, string> = {
  "foundation-claim-role": "Claim Role",
  "foundation-introduce": "Go to Community",
  "foundation-first-lesson": "Start Lesson",
  "foundation-risk-rules": "Open Trade OS",
  "foundation-starting-balance": "Set Balance",
};

const TASK_ROUTES: Record<string, string> = {
  "foundation-claim-role": "/academy/home",
  "foundation-introduce": "/academy/community",
  "foundation-first-lesson": "/academy/learn",
  "foundation-risk-rules": "/academy/trade",
  "foundation-starting-balance": "/academy/trade",
  "tw-lesson": "/academy/learn",
  "tw-trades": "/academy/trade",
  "tw-review": "/academy/progress",
  "tw-live": "/academy/live",
  "consistency-track-trades": "/academy/trade",
  "consistency-eod-check": "/academy/journal",
  "consistency-study": "/academy/learn",
  "consistency-no-trade": "/academy/trade",
};

const FOUNDATION_TASKS: Omit<TaskItem, "done">[] = [
  { id: "foundation-claim-role", title: "Claim your role" },
  { id: "foundation-first-lesson", title: "Watch first lesson" },
  { id: "foundation-introduce", title: "Introduce yourself" },
  { id: "foundation-risk-rules", title: "Set your risk rules" },
  { id: "foundation-starting-balance", title: "Set starting balance" },
];

const THIS_WEEK_TASKS: Omit<TaskItem, "done">[] = [
  { id: "tw-lesson", title: "Complete 1 lesson" },
  { id: "tw-trades", title: "Log 3 trades this week (or mark no-trade days)" },
  { id: "tw-review", title: "Complete weekly review" },
  { id: "tw-live", title: "Join 1 live or watch 1 replay" },
];

const CONSISTENCY_TASKS: Omit<TaskItem, "done">[] = [
  { id: "consistency-track-trades", title: "Track your trades today" },
  { id: "consistency-eod-check", title: "Complete end-of-day trade check" },
  { id: "consistency-study", title: "Study 30 minutes today" },
  { id: "consistency-no-trade", title: "Mark no-trade day (if no setup)" },
];

const COHORT_BUCKETS = [
  { label: "0-33%", min: 0, max: 33, barClass: "bg-rose-500/35", dotClass: "bg-rose-400" },
  { label: "34-66%", min: 34, max: 66, barClass: "bg-amber-500/35", dotClass: "bg-amber-400" },
  { label: "67-100%", min: 67, max: 100, barClass: "bg-emerald-500/35", dotClass: "bg-emerald-400" },
];

type CohortBucket = typeof COHORT_BUCKETS[number] & { count: number; pct: number };

type CohortUser = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  done: number;
  total: number;
  percent: number;
};

type CohortStats = {
  totalUsers: number;
  buckets: CohortBucket[];
  behind: CohortUser[];
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* ── Circular Progress Ring ── */
function ProgressRing({ done, total, size = 36 }: { done: number; total: number; size?: number }) {
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? done / total : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="shrink-0 -rotate-90 absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted/20"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-primary transition-all duration-500"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="text-[10px] font-bold text-foreground/70 tabular-nums">{done}/{total}</span>
    </div>
  );
}

export function GameplanCard({ onCheckIn, onClaimRole }: Props) {
  const { isAdmin } = useAcademyRole();
  const { onboarding } = useAcademyData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedMap, setCompletedMap] = useState<Record<string, string>>(loadCompleted);
  const [cohortStats, setCohortStats] = useState<CohortStats | null>(null);
  const [cohortLoading, setCohortLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(LS_DISMISSED_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(completedMap));
  }, [completedMap]);

  // Auto-detect foundation task completion from real data
  useEffect(() => {
    if (!user) return;
    let active = true;

    async function detectFoundation() {
      const autoCompleted: Record<string, string> = {};
      const now = new Date().toISOString();

      if (onboarding?.claimed_role) autoCompleted["foundation-claim-role"] = now;
      if (onboarding?.intro_posted) autoCompleted["foundation-introduce"] = now;
      if (onboarding?.first_lesson_completed) autoCompleted["foundation-first-lesson"] = now;

      try {
        const { data: rulesData } = await supabase
          .from("trading_rules")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (rulesData) autoCompleted["foundation-risk-rules"] = now;
      } catch {}

      try {
        const { data: balanceData } = await supabase
          .from("profiles")
          .select("account_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        if (balanceData && (balanceData as any).account_balance > 0)
          autoCompleted["foundation-starting-balance"] = now;
      } catch {}

      if (!active) return;

      setCompletedMap((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, ts] of Object.entries(autoCompleted)) {
          if (!next[id] && !dismissed.has(id)) {
            next[id] = ts;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }

    detectFoundation();
    return () => { active = false; };
  }, [user, onboarding, dismissed]);

  const groups = useMemo<TaskGroup[]>(() => {
    const hydrate = (items: Omit<TaskItem, "done">[]): TaskItem[] =>
      items.map((t) => ({ ...t, done: !!completedMap[t.id], route: TASK_ROUTES[t.id] }));

    return [
      { title: "Foundation", tasks: hydrate(FOUNDATION_TASKS) },
      { title: "This Week", tasks: hydrate(THIS_WEEK_TASKS) },
      { title: "Consistency", tasks: hydrate(CONSISTENCY_TASKS) },
    ];
  }, [completedMap]);

  const foundationTasks = groups[0].tasks;
  const foundationDone = foundationTasks.filter((t) => t.done).length;
  const foundationTotal = foundationTasks.length;
  const allFoundationDone = foundationDone === foundationTotal;

  const handleToggle = useCallback((taskId: string) => {
    setCompletedMap((prev) => {
      const next = { ...prev };
      const wasDone = !!next[taskId];
      if (wasDone) {
        delete next[taskId];
        if (taskId.startsWith("foundation-")) {
          setDismissed((d) => {
            const updated = new Set(d);
            updated.add(taskId);
            try { localStorage.setItem(LS_DISMISSED_KEY, JSON.stringify([...updated])); } catch {}
            return updated;
          });
        }
      } else {
        next[taskId] = new Date().toISOString();
        if (taskId.startsWith("foundation-")) {
          setDismissed((d) => {
            const updated = new Set(d);
            updated.delete(taskId);
            try { localStorage.setItem(LS_DISMISSED_KEY, JSON.stringify([...updated])); } catch {}
            return updated;
          });
        }
        queueMicrotask(() => {
          void hapticLight();
          void playCheckSound();
        });
      }
      return next;
    });
  }, []);

  const handleNavigate = useCallback((taskId: string) => {
    if (taskId === "foundation-claim-role" && onClaimRole) {
      onClaimRole();
      return;
    }
    const route = TASK_ROUTES[taskId];
    if (route) navigate(route);
  }, [navigate, onClaimRole]);

  const nextTask = useMemo(() => {
    return foundationTasks.find((t) => !t.done) ?? null;
  }, [foundationTasks]);

  // Admin cohort stats
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    async function loadCohort() {
      setCohortLoading(true);
      const { data: taskRows, error } = await (supabase as any)
        .from("user_task")
        .select("user_id, status, type")
        .eq("type", "onboarding");

      if (error || !taskRows) {
        if (active) setCohortLoading(false);
        return;
      }

      const progressMap = new Map<string, { done: number; total: number }>();

      for (const row of taskRows as any[]) {
        const current = progressMap.get(row.user_id) || { done: 0, total: 0 };
        current.total += 1;
        if (row.status === "done") current.done += 1;
        progressMap.set(row.user_id, current);
      }

      const userIds = Array.from(progressMap.keys());
      if (userIds.length === 0) {
        const emptyBuckets: CohortBucket[] = COHORT_BUCKETS.map((bucket) => ({
          ...bucket, count: 0, pct: 0,
        }));
        if (!active) return;
        setCohortStats({ totalUsers: 0, buckets: emptyBuckets, behind: [] });
        setCohortLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map<string, { name: string; avatar_url: string | null }>();
      for (const p of (profiles as any[] || [])) {
        profileMap.set(p.user_id, {
          name: p.display_name || "Student",
          avatar_url: p.avatar_url || null,
        });
      }

      const users: CohortUser[] = userIds.map((userId) => {
        const counts = progressMap.get(userId) || { done: 0, total: 0 };
        const percent = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
        const profile = profileMap.get(userId);
        return {
          user_id: userId,
          name: profile?.name || "Student",
          avatar_url: profile?.avatar_url || null,
          done: counts.done,
          total: counts.total,
          percent,
        };
      });

      const totalUsers = users.length;
      const buckets: CohortBucket[] = COHORT_BUCKETS.map((bucket) => {
        const count = users.filter((u) => u.percent >= bucket.min && u.percent <= bucket.max).length;
        const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
        return { ...bucket, count, pct };
      });

      const behind = users
        .filter((u) => u.percent < 67)
        .sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name))
        .slice(0, 6);

      if (!active) return;
      setCohortStats({ totalUsers, buckets, behind });
      setCohortLoading(false);
    }

    loadCohort();
    return () => { active = false; };
  }, [isAdmin]);

  /* ─── ALL DONE STATE ─── */
  if (allFoundationDone) {
    return (
      <div className="vault-luxury-card p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">You're all set</h2>
            <p className="text-sm text-muted-foreground">Onboarding complete. Time to trade.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── MAIN RENDER ─── */
  const HeroIcon = nextTask ? (TASK_ICONS[nextTask.id] || Rocket) : Rocket;
  const heroDescription = nextTask ? (TASK_DESCRIPTIONS[nextTask.id] || "") : "";
  const heroCta = nextTask ? (TASK_CTA[nextTask.id] || "Continue") : "";
  const otherTasks = foundationTasks.filter((t) => t.id !== nextTask?.id);

  return (
    <div className="vault-luxury-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Your Onboarding</h2>
        <ProgressRing done={foundationDone} total={foundationTotal} size={40} />
      </div>

      {/* Hero Next Step */}
      {nextTask && (
        <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <HeroIcon className="h-6 w-6 text-primary" />
              </div>
              {/* Soft glow */}
              <div className="absolute inset-0 rounded-xl bg-primary/5 blur-xl scale-150 pointer-events-none" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-base font-semibold text-foreground">{nextTask.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{heroDescription}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => handleNavigate(nextTask.id)}
            >
              {heroCta}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => handleToggle(nextTask.id)}
            >
              <Check className="h-4 w-4 mr-1" />
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Other Tasks — minimal list */}
      {otherTasks.length > 0 && (
        <div className="space-y-1">
          {otherTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => task.done ? handleToggle(task.id) : handleNavigate(task.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                task.done
                  ? "opacity-60 cursor-default"
                  : "hover:bg-muted/30 cursor-pointer group"
              )}
            >
              <div
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-200",
                  task.done
                    ? "bg-emerald-500/20 border-emerald-500/40"
                    : "border-muted-foreground/20 group-hover:border-primary/40"
                )}
              >
                {task.done && <Check className="h-3 w-3 text-emerald-400" />}
              </div>
              <span
                className={cn(
                  "text-sm flex-1",
                  task.done ? "text-muted-foreground" : "text-foreground/90 font-medium"
                )}
              >
                {task.title}
              </span>
              {!task.done && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/20 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Admin Cohort — collapsible */}
      {isAdmin && (
        <details className="pt-2 border-t border-border/10">
          <summary className="flex items-center justify-between cursor-pointer py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors">
            <span>Class Overview</span>
            <span className="text-[10px] font-normal normal-case tracking-normal">
              {cohortLoading ? "Loading..." : `${cohortStats?.totalUsers ?? 0} students`}
            </span>
          </summary>

          <div className="pt-3 space-y-3">
            <div className="h-2.5 rounded-full bg-muted/10 overflow-hidden flex">
              {(cohortStats?.buckets || COHORT_BUCKETS.map((b) => ({ ...b, count: 0, pct: 0 }))).map((bucket) => (
                <div
                  key={bucket.label}
                  className={bucket.barClass}
                  style={{ width: `${bucket.pct}%` }}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/60">
              {(cohortStats?.buckets || COHORT_BUCKETS.map((b) => ({ ...b, count: 0, pct: 0 }))).map((bucket) => (
                <span key={bucket.label} className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${bucket.dotClass}`} />
                  {bucket.label} {bucket.pct}%
                </span>
              ))}
            </div>

            {cohortStats?.behind && cohortStats.behind.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {cohortStats.behind.map((student) => (
                  <div
                    key={student.user_id}
                    className="flex items-center gap-1.5 rounded-full border border-border/10 px-2 py-1 bg-muted/5"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={student.avatar_url || undefined} alt={student.name} />
                      <AvatarFallback className="text-[9px]">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-foreground/80">{student.name}</span>
                    <span className="text-[10px] text-muted-foreground/60">{student.percent}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground/50">Everyone is on pace.</p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
