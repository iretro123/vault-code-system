import { useState, useEffect, useCallback } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, Navigate } from "react-router-dom";
import { Rocket, BookOpen, MessageSquare, ChevronRight, Check, ArrowRight, PenLine, BarChart3, X, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserTasks, UserTask } from "@/hooks/useUserTasks";
import { useLoginReminder } from "@/hooks/useLoginReminder";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OnboardingProgressCard } from "@/components/academy/OnboardingProgressCard";

const TASK_ROUTES: Record<string, string> = {
  "Claim Role": "/academy/start",
  "Watch First Lesson": "/academy/learn",
  "Introduce Yourself": "/academy/room/options-lounge",
  "Watch 1 lesson (10–15 min)": "/academy/learn",
  "Journal 1 trade (2 min)": "/academy/journal",
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
  const { user, profile, loading } = useAuth();
  const { tasks, loading: tasksLoading } = useUserTasks();
  useLoginReminder();

  // Today strip state
  const [stripDismissed, setStripDismissed] = useState(false);
  const [stripItems, setStripItems] = useState<{ label: string; route: string; icon: typeof BookOpen }[]>([]);
  const [stripLoading, setStripLoading] = useState(true);

  const todayKey = `today_strip_dismissed_${new Date().toISOString().slice(0, 10)}`;

  useEffect(() => {
    if (localStorage.getItem(todayKey) === "1") {
      setStripDismissed(true);
      setStripLoading(false);
    }
  }, [todayKey]);

  const computeStrip = useCallback(async () => {
    if (!user) { setStripLoading(false); return; }
    const items: { label: string; route: string; icon: typeof BookOpen }[] = [];

    // 1. Onboarding incomplete?
    const { data: onboarding } = await supabase
      .from("onboarding_state")
      .select("claimed_role, first_lesson_completed, intro_posted")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (onboarding) {
      if (!onboarding.claimed_role) {
        items.push({ label: "Set your experience level", route: "/academy/start", icon: Rocket });
      } else if (!onboarding.first_lesson_completed) {
        items.push({ label: "Watch your first lesson", route: "/academy/learn", icon: BookOpen });
      } else if (!onboarding.intro_posted) {
        items.push({ label: "Introduce yourself", route: "/academy/room/options-lounge", icon: MessageSquare });
      }
    }

    if (items.length < 2) {
      // 2. Recent lesson?
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: recentLessons } = await supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", twoDaysAgo)
        .limit(1);

      if (!recentLessons || recentLessons.length === 0) {
        if (!items.some((i) => i.route === "/academy/learn")) {
          items.push({ label: "Continue learning", route: "/academy/learn", icon: BookOpen });
        }
      }
    }

    if (items.length < 2) {
      // 3. Journal this week?
      const monday = new Date();
      monday.setDate(monday.getDate() - monday.getDay() + (monday.getDay() === 0 ? -6 : 1));
      const { data: weekJournals } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("user_id", user.id)
        .gte("entry_date", monday.toISOString().slice(0, 10))
        .limit(1);

      if (!weekJournals || weekJournals.length === 0) {
        items.push({ label: "Post a trade journal", route: "/academy/journal", icon: PenLine });
      }
    }

    setStripItems(items.slice(0, 2));
    setStripLoading(false);
  }, [user]);

  useEffect(() => {
    if (!stripDismissed) computeStrip();
  }, [stripDismissed, computeStrip]);

  const dismissStrip = () => {
    localStorage.setItem(todayKey, "1");
    setStripDismissed(true);
  };

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

      {/* Today smart strip */}
      {!stripDismissed && !stripLoading && stripItems.length > 0 && (
        <div className="px-4 md:px-6 pt-1">
          <div className="max-w-2xl rounded-lg border border-primary/20 bg-primary/[0.03] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Your next move</span>
              </div>
              <button onClick={dismissStrip} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors" title="Dismiss for today">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className={cn("grid gap-2", stripItems.length > 1 && "sm:grid-cols-2")}>
              {stripItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(item.route)}
                    className="flex items-center gap-3 rounded-md bg-background border border-border px-3 py-2.5 text-left hover:border-primary/30 transition-colors group"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <span className="text-sm text-foreground">{item.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 ml-auto shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 pb-6 space-y-6">
        {/* Onboarding progress */}
        {user && <OnboardingProgressCard userId={user.id} />}

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
