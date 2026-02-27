import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUserTasks, UserTask } from "@/hooks/useUserTasks";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onCheckIn: () => void;
}

interface TaskGroup {
  title: string;
  tasks: TaskItem[];
}

interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  route?: string;
  action?: string;
}

// Static foundation tasks derived from profile state
function buildFoundationTasks(profile: any): TaskItem[] {
  return [
    {
      id: "foundation-rules",
      title: "Install Risk Rules",
      done: !!profile?.onboarding_completed,
      route: "/academy/resources",
    },
    {
      id: "foundation-loss-lock",
      title: "Set Daily Loss Lock",
      done: !!profile?.onboarding_completed,
      route: "/academy/resources",
    },
    {
      id: "foundation-max-trades",
      title: "Set Max Trades/Day",
      done: !!profile?.onboarding_completed,
      route: "/academy/resources",
    },
  ];
}

export function GameplanCard({ onCheckIn }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { tasks, loading } = useUserTasks();
  const { isAdmin } = useAcademyRole();

  // Build task groups
  const groups = useMemo<TaskGroup[]>(() => {
    const foundation = buildFoundationTasks(profile);

    const weeklyTasks: TaskItem[] = tasks
      .filter((t) => t.type === "onboarding" || t.type === "daily")
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        title: t.title,
        done: t.status === "done",
        route:
          t.title.toLowerCase().includes("lesson") ? "/academy/learn" :
          t.title.toLowerCase().includes("trade") ? "/academy/trade" :
          t.title.toLowerCase().includes("journal") ? "/academy/journal" :
          t.title.toLowerCase().includes("review") ? "/academy/journal" :
          t.title.toLowerCase().includes("check") ? undefined : "/academy/learn",
        action: t.title.toLowerCase().includes("check") ? "checkin" : undefined,
      }));

    const consistency: TaskItem[] = [
      {
        id: "consistency-checkins",
        title: "3 Daily Check-Ins this week",
        done: false,
        action: "checkin",
      },
      {
        id: "consistency-journal",
        title: "2 Journal Entries this week",
        done: false,
        route: "/academy/journal",
      },
    ];

    return [
      { title: "Foundation", tasks: foundation },
      { title: "This Week", tasks: weeklyTasks.length > 0 ? weeklyTasks : [
        { id: "tw-lesson", title: "Watch Lesson 1", done: false, route: "/academy/learn" },
        { id: "tw-trade", title: "Log 1 Trade", done: false, route: "/academy/trade" },
        { id: "tw-review", title: "Run Weekly Review", done: false, route: "/academy/journal" },
      ] },
      { title: "Consistency", tasks: consistency },
    ];
  }, [tasks, profile]);

  const allTasks = groups.flatMap((g) => g.tasks);
  const doneCount = allTasks.filter((t) => t.done).length;
  const totalCount = allTasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Recently completed
  const recentDone = tasks
    .filter((t) => t.status === "done" && t.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 3);

  const handleTaskClick = (task: TaskItem) => {
    if (task.action === "checkin") {
      onCheckIn();
    } else if (task.route) {
      navigate(task.route);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="vault-glass-card p-6 md:p-8 space-y-6 animate-pulse">
        <div className="h-5 w-40 rounded bg-white/[0.06]" />
        <div className="h-2.5 w-full rounded bg-white/[0.04]" />
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-white/[0.03]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="vault-glass-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold text-foreground">
          Your Gameplan
        </h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">This week</span>
          <span className="text-xs font-bold text-foreground">{pct}% complete</span>
        </div>
        <Progress value={pct} className="h-2.5 bg-white/[0.06]" />
      </div>

      {/* Task groups */}
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/60">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
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
        ))}
      </div>

      {/* Recently Completed */}
      {recentDone.length > 0 && (
        <div className="pt-2 border-t border-white/[0.06] space-y-2">
          <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground/60">
            Recently Completed
          </p>
          {recentDone.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-emerald-400/60" />
              <span className="flex-1 truncate">{t.title}</span>
              <span className="text-[10px] tabular-nums">
                {new Date(t.completed_at!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
