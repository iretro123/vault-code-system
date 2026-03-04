import { useState, useMemo, useEffect, useCallback } from "react";
import { Check, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAcademyRole } from "@/hooks/useAcademyRole";

interface Props {
  onCheckIn: () => void;
}

interface TaskItem {
  id: string;
  title: string;
  done: boolean;
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

    // Check weekly reset
    const lastReset = localStorage.getItem(LS_RESET_KEY);
    const now = Date.now();
    if (!lastReset || now - new Date(lastReset).getTime() >= RESET_INTERVAL_MS) {
      // Remove tw-* and consistency-* keys, keep foundation-*
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

const MOCK_RECENT = [
  { id: "mock-1", title: "Claim your role", date: "Mar 1" },
  { id: "mock-2", title: "Watch first lesson", date: "Mar 2" },
  { id: "mock-3", title: "Set your risk rules", date: "Mar 3" },
];

export function GameplanCard({ onCheckIn }: Props) {
  const { isAdmin } = useAcademyRole();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [completedMap, setCompletedMap] = useState<Record<string, string>>(loadCompleted);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(completedMap));
  }, [completedMap]);

  // Build groups with done derived from completedMap
  const groups = useMemo<TaskGroup[]>(() => {
    const hydrate = (items: Omit<TaskItem, "done">[]): TaskItem[] =>
      items.map((t) => ({ ...t, done: !!completedMap[t.id] }));

    return [
      { title: "Foundation", tasks: hydrate(FOUNDATION_TASKS) },
      { title: "This Week", tasks: hydrate(THIS_WEEK_TASKS) },
      { title: "Consistency", tasks: hydrate(CONSISTENCY_TASKS) },
    ];
  }, [completedMap]);

  // Weekly progress = This Week + Consistency only
  const weeklyTasks = groups.filter((g) => g.title !== "Foundation").flatMap((g) => g.tasks);
  const doneCount = weeklyTasks.filter((t) => t.done).length;
  const totalCount = weeklyTasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // All tasks lookup for recently completed
  const allTasksLookup = useMemo(() => {
    const map: Record<string, string> = {};
    [...FOUNDATION_TASKS, ...THIS_WEEK_TASKS, ...CONSISTENCY_TASKS].forEach((t) => {
      map[t.id] = t.title;
    });
    return map;
  }, []);

  // Recently completed from local state
  const recentItems = useMemo(() => {
    const entries = Object.entries(completedMap)
      .filter(([id]) => allTasksLookup[id])
      .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, 5)
      .map(([id, ts]) => ({
        id,
        title: allTasksLookup[id],
        date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
    return entries.length > 0 ? entries : MOCK_RECENT;
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

  const nextTask = useMemo(() => {
    for (const group of groups) {
      const incomplete = group.tasks.find((t) => !t.done);
      if (incomplete) return incomplete;
    }
    return null;
  }, [groups]);

  const showAll = expanded || !isMobile;

  return (
    <div className="vault-glass-card p-5 md:p-6 space-y-4">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold text-foreground">
          Your Gameplan
        </h2>
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
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <span className="text-[10px] uppercase tracking-widest font-semibold text-blue-400/70">Next Step</span>
          <span className="flex-1 text-sm font-medium text-foreground/90 truncate">{nextTask.title}</span>
          <button onClick={() => handleToggle(nextTask.id)}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0 transition-colors duration-100">
            Complete
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.1)" }}>
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400/90">You're on track</span>
        </div>
      )}

      {/* Progress — weekly only */}
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

      {/* Collapsible task groups */}
      {showTasks && (
        <>
          {groups.map((group) => (
            <TaskGroupSection key={group.title} group={group} onToggle={handleToggle} />
          ))}

          {/* Recently Completed */}
          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/60">
              Recently Completed
            </p>
            {recentItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-emerald-400/60" />
                <span className="flex-1 truncate">{item.title}</span>
                <span className="text-[10px] tabular-nums">{item.date}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Toggle tasks visibility */}
      <button
        onClick={() => setShowTasks((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-100"
      >
        {showTasks ? "Hide Tasks" : "Show Tasks"}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${showTasks ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}

/* ── Task Group Section ── */
function TaskGroupSection({ group, onToggle }: { group: TaskGroup; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/60">
        {group.title}
      </p>
      <div className="space-y-1">
        {group.tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onToggle(task.id)}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors duration-100 hover:bg-white/[0.06]"
            style={{
              background: task.done ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                task.done
                  ? "bg-emerald-500/20 border-emerald-500/40"
                  : "border-white/20"
              }`}
            >
              {task.done && <Check className="h-3 w-3 text-emerald-400" />}
            </div>
            <span
              className={`flex-1 text-sm font-medium ${
                task.done ? "text-muted-foreground line-through" : "text-foreground/90"
              }`}
            >
              {task.title}
            </span>
            {!task.done && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
