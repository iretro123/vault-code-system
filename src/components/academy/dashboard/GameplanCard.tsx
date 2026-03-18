import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Check, Plus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
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

function getDaysUntilReset(): number {
  try {
    const lastReset = localStorage.getItem(LS_RESET_KEY);
    if (!lastReset) return 7;
    const daysSince = Math.floor((Date.now() - new Date(lastReset).getTime()) / 86400000);
    return Math.max(7 - daysSince, 0);
  } catch {
    return 7;
  }
}

const TASK_ROUTES: Record<string, string> = {
  "foundation-claim-role": "/academy/home",
  "foundation-introduce": "/academy/community",
  "foundation-first-lesson": "/academy/learn",
  "foundation-risk-rules": "/academy/settings",
  "foundation-starting-balance": "/academy/settings",
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
  { id: "foundation-introduce", title: "Introduce yourself in Trading Floor" },
  { id: "foundation-first-lesson", title: "Watch first lesson" },
  { id: "foundation-risk-rules", title: "Set your risk rules" },
  { id: "foundation-starting-balance", title: "Set your starting balance" },
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

function TaskConfettiBurst() {
  const particles = useMemo(() => {
    const colors = ["#34D399", "#60A5FA", "#F59E0B", "#F472B6", "#A78BFA"];
    return Array.from({ length: 18 }, (_, i) => {
      const angle = -70 + Math.random() * 140;
      const distance = 120 + Math.random() * 80;
      return {
        id: i,
        color: colors[i % colors.length],
        left: 20 + Math.random() * 60,
        delay: Math.random() * 0.15,
        angle,
        distance,
        rotation: Math.random() * 540 - 270,
        width: 3 + Math.random() * 2,
        height: 6 + Math.random() * 5,
        borderRadius: Math.random() > 0.6 ? "999px" : "1px",
      };
    });
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            bottom: "18%",
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            borderRadius: p.borderRadius,
            animationName: "chat-confetti-burst",
            animationDuration: "1.2s",
            animationDelay: `${p.delay}s`,
            animationTimingFunction: "cubic-bezier(0.2, 0.6, 0.4, 1)",
            animationFillMode: "forwards",
            opacity: 0,
            ["--confetti-x" as string]: `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
            ["--confetti-y" as string]: `${-p.distance}px`,
            ["--confetti-r" as string]: `${p.rotation}deg`,
          }}
        />
      ))}
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
  const [confettiKey, setConfettiKey] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimerRef = useRef<number | null>(null);

  const triggerConfetti = useCallback(() => {
    setConfettiKey((k) => k + 1);
    setShowConfetti(true);
    if (confettiTimerRef.current) {
      window.clearTimeout(confettiTimerRef.current);
    }
    confettiTimerRef.current = window.setTimeout(() => {
      setShowConfetti(false);
      confettiTimerRef.current = null;
    }, 1200);
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(completedMap));
  }, [completedMap]);

  useEffect(() => {
    return () => {
      if (confettiTimerRef.current) {
        window.clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = null;
      }
    };
  }, []);

  // Auto-detect foundation task completion from real data
  useEffect(() => {
    if (!user) return;
    let active = true;

    async function detectFoundation() {
      const autoCompleted: Record<string, string> = {};
      const now = new Date().toISOString();

      // 1. Claim role — from onboarding_state
      if (onboarding?.claimed_role) {
        autoCompleted["foundation-claim-role"] = now;
      }

      // 2. Introduce yourself — from onboarding_state
      if (onboarding?.intro_posted) {
        autoCompleted["foundation-introduce"] = now;
      }

      // 3. Watch first lesson — from onboarding_state
      if (onboarding?.first_lesson_completed) {
        autoCompleted["foundation-first-lesson"] = now;
      }

      // 4. Set risk rules — check if trading_rules row exists
      try {
        const { data: rulesData } = await supabase
          .from("trading_rules")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (rulesData) {
          autoCompleted["foundation-risk-rules"] = now;
        }
      } catch {}

      // 5. Set starting balance — check account_balance from profiles table
      try {
        const { data: balanceData } = await supabase
          .from("profiles")
          .select("account_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        if (balanceData && (balanceData as any).account_balance > 0) {
          autoCompleted["foundation-starting-balance"] = now;
        }
      } catch {}

      if (!active) return;

      // Merge auto-detected into completedMap (skip if user manually dismissed)
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

  const weeklyTasks = groups.filter((g) => g.title !== "Foundation").flatMap((g) => g.tasks);
  const doneCount = weeklyTasks.filter((t) => t.done).length;
  const totalCount = weeklyTasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const activeGroupIndex = useMemo(() => {
    const idx = groups.findIndex((group) => group.tasks.some((t) => !t.done));
    return idx === -1 ? groups.length - 1 : idx;
  }, [groups]);

  const activeGroup = groups[activeGroupIndex];
  const activeTaskIds = useMemo(() => new Set(activeGroup?.tasks.map((t) => t.id)), [activeGroup]);

  const allTasksLookup = useMemo(() => {
    const map: Record<string, string> = {};
    [...FOUNDATION_TASKS, ...THIS_WEEK_TASKS, ...CONSISTENCY_TASKS].forEach((t) => {
      map[t.id] = t.title;
    });
    return map;
  }, []);

  const recentItems = useMemo(() => {
    return Object.entries(completedMap)
      .filter(([id]) => allTasksLookup[id] && activeTaskIds.has(id))
      .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 5)
      .map(([id, ts]) => ({
        id,
        title: allTasksLookup[id],
        date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
  }, [completedMap, allTasksLookup, activeTaskIds]);

  const handleToggle = useCallback((taskId: string) => {
    setCompletedMap((prev) => {
      const next = { ...prev };
      const wasDone = !!next[taskId];
      if (wasDone) {
        delete next[taskId];
        // Track dismissal so auto-detect doesn't re-check it
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
        // Remove from dismissed if user re-checks
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
        queueMicrotask(() => {
          triggerConfetti();
        });
      }
      return next;
    });
  }, [triggerConfetti]);

  const handleNavigate = useCallback((taskId: string) => {
    if (taskId === "foundation-claim-role" && onClaimRole) {
      onClaimRole();
      return;
    }
    const route = TASK_ROUTES[taskId];
    if (route) navigate(route);
  }, [navigate, onClaimRole]);

  const nextTask = useMemo(() => {
    for (const group of groups) {
      const incomplete = group.tasks.find((t) => !t.done);
      if (incomplete) return incomplete;
    }
    return null;
  }, [groups]);

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
          ...bucket,
          count: 0,
          pct: 0,
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

    return () => {
      active = false;
    };
  }, [isAdmin]);

  return (
    <div className="vault-premium-card p-5 md:p-6 space-y-4 relative overflow-hidden">
      {showConfetti && <TaskConfettiBurst key={confettiKey} />}
      <div className="w-full flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold text-foreground">Your Onboarding</h2>
        {isAdmin && (
          <span className="hidden md:inline-flex">
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Button>
          </span>
        )}
      </div>

      {/* Next Step */}
      {nextTask ? (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
        >
          <span className="text-[10px] uppercase tracking-widest font-semibold text-blue-400/70">Next Step</span>
          <button
            onClick={() => handleNavigate(nextTask.id)}
            className="flex-1 text-sm font-medium text-foreground/90 truncate text-left hover:text-primary transition-colors duration-100"
          >
            {nextTask.title}
          </button>
          <button
            onClick={() => handleToggle(nextTask.id)}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0 transition-colors duration-100"
          >
            Complete
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.1)" }}
        >
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400/90">You're on track</span>
        </div>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">This week</span>
          <span className="text-xs font-bold text-foreground">{doneCount}/{totalCount} complete</span>
        </div>
        <Progress value={pct} className="h-2.5 bg-white/[0.06]" />
        <span className="text-[10px] text-muted-foreground/40">
          Resets in {getDaysUntilReset()} day{getDaysUntilReset() !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Task groups */}
      {activeGroup && (
        <div className="space-y-3">
          <TaskGroupSection group={activeGroup} onToggle={handleToggle} onNavigate={handleNavigate} />
          {activeGroupIndex < groups.length - 1 && (
            <p className="text-[11px] text-muted-foreground/50">
              Complete this section to unlock {groups[activeGroupIndex + 1].title}.
            </p>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/60">
          Recently Completed
        </p>
        {recentItems.length > 0 ? recentItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-emerald-400/60" />
            <span className="flex-1 truncate">{item.title}</span>
            <span className="text-[10px] tabular-nums">{item.date}</span>
          </div>
        )) : (
          <p className="text-xs text-muted-foreground/50">No activity yet — complete your first task to see it here.</p>
        )}
      </div>

      {isAdmin && (
        <div className="pt-2 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/60">
              Cohort Tracker
            </p>
            <span className="text-[10px] text-muted-foreground/50">
              {cohortLoading ? "Loading..." : `${cohortStats?.totalUsers ?? 0} students`}
            </span>
          </div>

          <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden flex">
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
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.08] px-2 py-1 bg-white/[0.03]"
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
      )}
    </div>
  );
}

/* ── Task Group Section ── */
function TaskGroupSection({
  group,
  onToggle,
  onNavigate,
}: {
  group: TaskGroup;
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/60">
        {group.title}
      </p>
      <div className="space-y-1">
        {group.tasks.map((task) => (
          <div
            key={task.id}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors duration-100 hover:bg-white/[0.06]"
            style={{
              background: task.done ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Checkbox area — toggles completion */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
              className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-100"
              style={{
                backgroundColor: task.done ? "rgba(16,185,129,0.2)" : "transparent",
                borderColor: task.done ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.2)",
              }}
              aria-label={task.done ? `Uncheck ${task.title}` : `Mark ${task.title} done`}
            >
              {task.done && <Check className="h-3 w-3 text-emerald-400" />}
            </button>

            {/* Title area — always navigates */}
            <button
              onClick={() => onNavigate(task.id)}
              className={`flex-1 text-sm font-medium text-left truncate transition-colors duration-100 ${
                task.done ? "text-muted-foreground line-through hover:text-foreground/70" : "text-foreground/90 hover:text-primary"
              }`}
            >
              {task.title}
            </button>

            {task.route && (
              <ChevronRight className={`h-4 w-4 shrink-0 ${task.done ? "text-muted-foreground/20" : "text-muted-foreground/40"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
