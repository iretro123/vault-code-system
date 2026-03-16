import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Check, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAcademyRole } from "@/hooks/useAcademyRole";

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


export function GameplanCard({ onCheckIn, onClaimRole }: Props) {
  const { isAdmin } = useAcademyRole();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showTasks, setShowTasks] = useState(false);
  const [completedMap, setCompletedMap] = useState<Record<string, string>>(loadCompleted);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(completedMap));
  }, [completedMap]);

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

  const allTasksLookup = useMemo(() => {
    const map: Record<string, string> = {};
    [...FOUNDATION_TASKS, ...THIS_WEEK_TASKS, ...CONSISTENCY_TASKS].forEach((t) => {
      map[t.id] = t.title;
    });
    return map;
  }, []);

  const recentItems = useMemo(() => {
    return Object.entries(completedMap)
      .filter(([id]) => allTasksLookup[id])
      .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 5)
      .map(([id, ts]) => ({
        id,
        title: allTasksLookup[id],
        date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
  }, [completedMap, allTasksLookup]);

  const handleToggle = useCallback((taskId: string) => {
    setCompletedMap((prev) => {
      const next = { ...prev };
      if (next[taskId]) {
        delete next[taskId];
      } else {
        next[taskId] = new Date().toISOString();
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
    for (const group of groups) {
      const incomplete = group.tasks.find((t) => !t.done);
      if (incomplete) return incomplete;
    }
    return null;
  }, [groups]);

  return (
    <div ref={cardRef} className="vault-premium-card p-5 md:p-6 space-y-4">
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
      {showTasks && (
        <>
          {groups.map((group) => (
            <TaskGroupSection key={group.title} group={group} onToggle={handleToggle} onNavigate={handleNavigate} />
          ))}

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
        </>
      )}

      <button
        onClick={() => {
          setShowTasks((v) => {
            if (v) {
              requestAnimationFrame(() => {
                cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              });
            }
            return !v;
          });
        }}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-100"
      >
        {showTasks ? "Hide Tasks" : "Show Tasks"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${showTasks ? "rotate-180" : ""}`} />
      </button>
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

            {/* Title area — navigates if incomplete */}
            {!task.done && task.route ? (
              <button
                onClick={() => onNavigate(task.id)}
                className="flex-1 text-sm font-medium text-foreground/90 text-left hover:text-primary transition-colors duration-100 truncate"
              >
                {task.title}
              </button>
            ) : (
              <span
                className={`flex-1 text-sm font-medium truncate ${
                  task.done ? "text-muted-foreground line-through" : "text-foreground/90"
                }`}
              >
                {task.title}
              </span>
            )}

            {!task.done && task.route && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
