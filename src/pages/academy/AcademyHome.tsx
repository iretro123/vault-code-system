import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, Navigate } from "react-router-dom";
import { Rocket, BookOpen, MessageSquare, ChevronRight, Check, ArrowRight, PenLine, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserTasks, UserTask } from "@/hooks/useUserTasks";
import { useLoginReminder } from "@/hooks/useLoginReminder";
import { cn } from "@/lib/utils";

const TASK_ROUTES: Record<string, string> = {
  "Claim Role": "/academy/start",
  "Watch First Lesson": "/academy/learn",
  "Introduce Yourself": "/academy/room/options-lounge",
  "Watch 1 lesson (10–15 min)": "/academy/learn",
  "Journal 1 trade (2 min)": "/log",
  "Post 1 trade recap or insight": "/academy/room/trade-recaps",
};

const TASK_ICONS: Record<string, typeof Rocket> = {
  "Claim Role": Rocket,
  "Watch First Lesson": BookOpen,
  "Introduce Yourself": MessageSquare,
  "Watch 1 lesson (10–15 min)": BookOpen,
  "Journal 1 trade (2 min)": PenLine,
  "Post 1 trade recap or insight": BarChart3,
};

const AcademyHome = () => {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const { tasks, loading: tasksLoading } = useUserTasks();
  useLoginReminder();

  if (loading) return null;

  const isFirstVisit =
    profile &&
    (profile as any).academy_experience === "newbie" &&
    !profile.onboarding_completed;

  if (isFirstVisit) {
    return <Navigate to="/academy/start" replace />;
  }

  const displayName = profile?.display_name || profile?.email?.split("@")[0] || "Trader";

  // Today section: show daily tasks first, then pending onboarding
  const today = new Date().toISOString().slice(0, 10);
  const dailyToday = tasks.filter((t) => t.type === "daily" && t.due_date === today);
  const onboardingPending = tasks.filter((t) => t.type === "onboarding" && t.status === "pending");
  const todayTasks = [...dailyToday, ...onboardingPending];
  const pendingTasks = todayTasks.filter((t) => t.status === "pending");
  const doneTodayTasks = todayTasks.filter((t) => t.status === "done");
  const totalTasks = todayTasks.length;
  const remaining = pendingTasks.length;
  const primaryTask = pendingTasks[0] ?? null;
  const secondaryTasks = pendingTasks.slice(1, 3);
  const allDone = remaining === 0 && totalTasks > 0;

  return (
    <AcademyLayout>
      <PageHeader
        title={`Welcome back, ${displayName}`}
        subtitle="Your trading discipline journey continues"
      />
      <div className="px-4 md:px-6 pb-6 space-y-6">
        {/* Today section */}
        {!tasksLoading && totalTasks > 0 && (
          <div className="space-y-3 max-w-2xl">
            <p className="section-title">Today</p>

            {/* Progress line */}
            {!allDone && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    You're <span className="font-semibold text-foreground">{remaining} step{remaining !== 1 ? "s" : ""}</span> from being fully set up.
                  </p>
                  <span className="text-xs text-muted-foreground">{doneTodayTasks.length}/{totalTasks}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (doneTodayTasks.length / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {allDone && (
              <p className="text-sm text-primary font-medium">✓ All set up — you're ready to trade with discipline.</p>
            )}

            {/* Primary task */}
            {primaryTask && (
              <Card
                className="vault-card group cursor-pointer p-5 border-primary/40 ring-1 ring-primary/20 transition-colors hover:border-primary/60"
                onClick={() => navigate(TASK_ROUTES[primaryTask.title] ?? "/academy/learn")}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <TaskIcon task={primaryTask} className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground">{primaryTask.title}</h4>
                    {primaryTask.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{primaryTask.description}</p>
                    )}
                  </div>
                  <Button size="sm" className="gap-1.5 shrink-0">
                    Start <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Secondary tasks */}
            {secondaryTasks.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {secondaryTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="vault-card group cursor-pointer p-4 transition-colors hover:border-primary/30"
                    onClick={() => navigate(TASK_ROUTES[task.title] ?? "/academy/learn")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <TaskIcon task={task} className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                        {task.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{task.description}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main CTA */}
        <div className="max-w-lg">
          <p className="text-sm text-muted-foreground mb-4">
            Pick up where you left off or start a new module.
          </p>
          <Button onClick={() => navigate("/academy/learn")} className="gap-2">
            <BookOpen className="h-4 w-4" />
            Continue Learning
          </Button>
        </div>
      </div>
    </AcademyLayout>
  );
};

function TaskIcon({ task, className }: { task: UserTask; className?: string }) {
  if (task.status === "done") return <Check className={className} />;
  const Icon = TASK_ICONS[task.title] ?? BookOpen;
  return <Icon className={className} />;
}

export default AcademyHome;
