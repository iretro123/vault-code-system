import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, BookOpen, PenLine, Users, Radio, Flame,
  ShieldCheck, ArrowRight, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { format } from "date-fns";

/* ─── types ─── */
interface Prompt {
  key: string;
  icon: React.ReactNode;
  message: string;
  cta: string;
  ctaAction?: string; // route to navigate after close
  accent: "blue" | "amber" | "emerald";
  yesLabel?: string;
  noLabel?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ─── accent helpers ─── */
const accentMap = {
  blue: {
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    glow: "rgba(59,130,246,0.15)",
    text: "rgb(96,165,250)",
    solid: "hsl(217,91%,60%)",
  },
  amber: {
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    glow: "rgba(245,158,11,0.15)",
    text: "rgb(251,191,36)",
    solid: "hsl(38,92%,50%)",
  },
  emerald: {
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
    glow: "rgba(16,185,129,0.15)",
    text: "rgb(52,211,153)",
    solid: "hsl(160,84%,39%)",
  },
};

export function DailyCheckInModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);

  /* ─── data state ─── */
  const [loading, setLoading] = useState(true);
  const [lessonsThisWeek, setLessonsThisWeek] = useState(0);
  const [journalsThisWeek, setJournalsThisWeek] = useState(0);
  const [tradesToday, setTradesToday] = useState(0);
  const [messagesThisWeek, setMessagesThisWeek] = useState(0);
  const [lastSessionDate, setLastSessionDate] = useState<string | null>(null);
  const [nextSession, setNextSession] = useState<{ title: string; date: string } | null>(null);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [lastCheckinBrokeRules, setLastCheckinBrokeRules] = useState(false);
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);

  /* ─── answer state ─── */
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  /* ─── fetch all context on open ─── */
  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    setAnswers({});
    setDone(false);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString();

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthStr = monthAgo.toISOString();

    const fetchAll = async () => {
      const [
        lessonsRes, journalRes, tradesRes, msgsRes,
        attendanceRes, nextSessionRes, checklistRes,
        profileRes, totalLessonsRes,
      ] = await Promise.all([
        supabase.from("lesson_progress").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).eq("completed", true).gte("completed_at", weekStr),
        supabase.from("journal_entries").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", weekStr),
        supabase.from("approved_plans").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).eq("status", "closed").gte("created_at", todayStr),
        supabase.from("academy_messages").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", weekStr),
        supabase.from("live_session_attendance").select("clicked_at")
          .eq("user_id", user.id).order("clicked_at", { ascending: false }).limit(1),
        supabase.from("live_sessions").select("title, session_date")
          .gte("session_date", new Date().toISOString()).eq("status", "scheduled")
          .order("session_date", { ascending: true }).limit(1),
        supabase.from("vault_daily_checklist").select("date, mental_state")
          .eq("user_id", user.id).order("date", { ascending: false }).limit(30),
        supabase.from("profiles").select("created_at").eq("id", user.id).single(),
        supabase.from("lesson_progress").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).eq("completed", true),
      ]);

      setLessonsThisWeek(lessonsRes.count || 0);
      setJournalsThisWeek(journalRes.count || 0);
      setTradesToday(tradesRes.count || 0);
      setMessagesThisWeek(msgsRes.count || 0);
      setTotalLessons(totalLessonsRes.count || 0);

      const att = attendanceRes.data;
      setLastSessionDate(att?.[0]?.clicked_at || null);

      const ns = nextSessionRes.data;
      if (ns?.[0]) {
        setNextSession({ title: ns[0].title, date: ns[0].session_date });
      } else {
        setNextSession(null);
      }

      // Streak calc
      const checks = checklistRes.data || [];
      let streak = 0;
      if (checks.length > 0) {
        const today = new Date();
        for (let i = 0; i < checks.length; i++) {
          const expected = new Date(today);
          expected.setDate(expected.getDate() - i);
          const expectedStr = expected.toISOString().slice(0, 10);
          if (checks[i]?.date === expectedStr) {
            streak++;
          } else {
            // Allow today to be missing (hasn't checked in yet)
            if (i === 0 && checks[0]?.date !== expectedStr) {
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              if (checks[0]?.date === yesterday.toISOString().slice(0, 10)) {
                streak++;
              } else break;
            } else break;
          }
        }
      }
      setCheckinStreak(streak);

      // Last checkin broke rules
      if (checks.length > 0) {
        const lastMental = (checks[0] as any)?.mental_state;
        setLastCheckinBrokeRules(lastMental !== undefined && lastMental <= 3);
      }

      // Account age
      if (profileRes.data?.created_at) {
        const created = new Date(profileRes.data.created_at);
        const diff = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
        setAccountAgeDays(diff);
      }

      setLoading(false);
    };

    fetchAll();
  }, [open, user]);

  /* ─── build personalized prompts ─── */
  const prompts = useMemo<Prompt[]>(() => {
    if (loading) return [];

    const list: Prompt[] = [];

    // 1. Streak acknowledgment (if 3+)
    if (checkinStreak >= 3) {
      list.push({
        key: "streak",
        icon: <Flame className="h-5 w-5" />,
        message: `Day ${checkinStreak} streak. Keep it going?`,
        cta: "Lock It In",
        accent: "emerald",
        yesLabel: "Lock It In",
        noLabel: "Skip",
      });
    }

    // 2. Lesson nudge
    if (lessonsThisWeek === 0) {
      list.push({
        key: "lesson_nudge",
        icon: <BookOpen className="h-5 w-5" />,
        message: totalLessons === 0
          ? "Start your first lesson? Only takes 15 min."
          : "Watch a lesson this week? Only takes 15 min.",
        cta: "Watch Now",
        ctaAction: "/academy/learn",
        accent: "blue",
        yesLabel: "Yes",
        noLabel: "Not yet",
      });
    }

    // 3. Journal nudge (traded but no journal)
    if (tradesToday > 0 && journalsThisWeek === 0) {
      list.push({
        key: "journal_nudge",
        icon: <PenLine className="h-5 w-5" />,
        message: `You took ${tradesToday} trade${tradesToday > 1 ? "s" : ""} today. Journal it while it's fresh.`,
        cta: "Journal Now",
        ctaAction: "/academy/journal",
        accent: "amber",
        yesLabel: "Yes",
        noLabel: "Later",
      });
    }

    // 4. Community nudge
    if (messagesThisWeek === 0) {
      list.push({
        key: "community_nudge",
        icon: <Users className="h-5 w-5" />,
        message: "Anything you learned? Share with the group.",
        cta: "Post Now",
        ctaAction: "/academy/community",
        accent: "blue",
        yesLabel: "Post Now",
        noLabel: "Skip",
      });
    }

    // 5. Live session nudge
    const daysSinceSession = lastSessionDate
      ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    if (daysSinceSession > 14 && nextSession) {
      const sessionDate = new Date(nextSession.date);
      const formatted = format(sessionDate, "EEE, MMM d 'at' h:mm a");
      list.push({
        key: "live_nudge",
        icon: <Radio className="h-5 w-5" />,
        message: `Attend a call? Next: ${nextSession.title} — ${formatted}`,
        cta: "View Schedule",
        ctaAction: "/academy/live",
        accent: "blue",
        yesLabel: "I'll Be There",
        noLabel: "Skip",
      });
    }

    // 6. Rules check (if last check-in had low mental state / broke rules)
    if (lastCheckinBrokeRules) {
      list.push({
        key: "rules_check",
        icon: <ShieldCheck className="h-5 w-5" />,
        message: "Did you stick to the plan today?",
        cta: "Yes",
        accent: "amber",
        yesLabel: "Yes",
        noLabel: "No",
      });
    }

    // 7. New user — set rules
    if (accountAgeDays < 7 && totalLessons === 0) {
      // Remove lesson nudge duplicate for brand new users, replace with onboarding
      const idx = list.findIndex((p) => p.key === "lesson_nudge");
      if (idx !== -1) list.splice(idx, 1);
      list.push({
        key: "setup_rules",
        icon: <ShieldCheck className="h-5 w-5" />,
        message: "Set up your trading rules yet?",
        cta: "Set Rules",
        ctaAction: "/rules",
        accent: "blue",
        yesLabel: "Set Rules",
        noLabel: "Later",
      });
    }

    // Cap at 5 prompts max
    return list.slice(0, 5);
  }, [loading, lessonsThisWeek, journalsThisWeek, tradesToday, messagesThisWeek,
    lastSessionDate, nextSession, checkinStreak, lastCheckinBrokeRules, accountAgeDays, totalLessons]);

  /* ─── If no personalized prompts, show a default ─── */
  const finalPrompts = useMemo(() => {
    if (prompts.length > 0) return prompts;
    return [{
      key: "all_good",
      icon: <CheckCircle2 className="h-5 w-5" />,
      message: "You're on track. Keep building discipline.",
      cta: "Done",
      ctaAction: undefined,
      accent: "emerald" as const,
      yesLabel: "Lock It In",
      noLabel: "Skip",
    } satisfies Prompt];
  }, [prompts]);

  const answeredCount = Object.keys(answers).length;
  const totalCount = finalPrompts.length;
  const allAnswered = answeredCount >= totalCount;

  /* ─── answer a prompt ─── */
  const handleAnswer = useCallback((key: string, response: string, ctaAction?: string) => {
    setAnswers((prev) => ({ ...prev, [key]: response }));

    // If they tapped "yes" on something with a route, queue navigation after close
    if ((response === "yes" || response === "cta") && ctaAction) {
      // We'll navigate on close
    }
  }, []);

  /* ─── submit all ─── */
  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    // Save to daily_checkin_responses
    const rows = finalPrompts.map((p) => ({
      user_id: user.id,
      date: todayStr,
      prompt_key: p.key,
      response: answers[p.key] || "skipped",
    }));

    await supabase.from("daily_checkin_responses").insert(rows);

    // Also log the vault_daily_checklist for streak continuity
    await supabase.from("vault_daily_checklist").insert({
      user_id: user.id,
      date: todayStr,
      plan_reviewed: true,
      risk_confirmed: true,
      sleep_quality: 5,
      mental_state: 5,
      emotional_control: 5,
      completed: true,
    });

    setSubmitting(false);
    setDone(true);
    toast({ title: "Check-in locked in", description: `${answeredCount}/${totalCount} habits tracked today.` });
  };

  /* ─── close + navigate if needed ─── */
  const handleClose = () => {
    // Find if any answered "yes/cta" prompt has a ctaAction
    const navTarget = finalPrompts.find(
      (p) => (answers[p.key] === "yes" || answers[p.key] === "cta") && p.ctaAction
    );

    onOpenChange(false);

    setTimeout(() => {
      if (navTarget?.ctaAction) {
        navigate(navTarget.ctaAction);
      }
      setAnswers({});
      setDone(false);
      setLoading(true);
    }, 200);
  };

  /* ─── completion summary ─── */
  const yesCount = finalPrompts.filter((p) => answers[p.key] === "yes" || answers[p.key] === "cta").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[460px] border-white/[0.08] gap-0 p-0 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, hsl(220,20%,9%) 0%, hsl(220,22%,6%) 100%)",
        }}
      >
        {done ? (
          /* ─── COMPLETION ─── */
          <div className="py-10 px-6 flex flex-col items-center gap-4 text-center animate-fade-in">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center"
              style={{ background: accentMap.emerald.bg, border: `1px solid ${accentMap.emerald.border}` }}>
              <CheckCircle2 className="h-7 w-7" style={{ color: accentMap.emerald.text }} />
            </div>
            <div>
              <p className="text-lg font-bold text-[rgba(255,255,255,0.94)]">
                {yesCount}/{totalCount} habits hit today
              </p>
              {checkinStreak >= 1 && (
                <p className="text-sm mt-1" style={{ color: accentMap.emerald.text }}>
                  Day {checkinStreak + 1} locked in 🔥
                </p>
              )}
            </div>

            {/* Show CTA links for "yes" answers */}
            {finalPrompts
              .filter((p) => (answers[p.key] === "yes" || answers[p.key] === "cta") && p.ctaAction)
              .slice(0, 2)
              .map((p) => (
                <button
                  key={p.key}
                  onClick={() => { handleClose(); navigate(p.ctaAction!); }}
                  className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: accentMap[p.accent].text }}
                >
                  {p.cta} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ))}

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground mt-3"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        ) : (
          /* ─── QUESTION ENGINE ─── */
          <div className="animate-fade-in">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <p className="text-lg font-bold text-[rgba(255,255,255,0.94)]">Daily Check-In</p>
              <p className="text-xs text-[rgba(255,255,255,0.45)] mt-1">
                {answeredCount}/{totalCount} · Takes 15 seconds
              </p>
              {/* Progress dots */}
              <div className="flex gap-1.5 mt-3">
                {finalPrompts.map((p, i) => (
                  <div
                    key={p.key}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background: answers[p.key]
                        ? accentMap[p.accent].solid
                        : "rgba(255,255,255,0.08)",
                    }}
                  />
                ))}
              </div>
            </div>

            {loading ? (
              <div className="px-6 pb-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="px-6 pb-6 space-y-2.5">
                {finalPrompts.map((prompt) => {
                  const answered = answers[prompt.key];
                  const colors = accentMap[prompt.accent];

                  return (
                    <div
                      key={prompt.key}
                      className="rounded-xl transition-all duration-200"
                      style={{
                        background: answered ? colors.bg : "rgba(255,255,255,0.03)",
                        border: `1px solid ${answered ? colors.border : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        {/* Icon */}
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                          style={{
                            background: answered ? colors.bg : "rgba(255,255,255,0.05)",
                            color: answered ? colors.text : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {answered ? <CheckCircle2 className="h-5 w-5" /> : prompt.icon}
                        </div>

                        {/* Message */}
                        <p className="text-[13px] font-medium flex-1 leading-snug"
                          style={{ color: answered ? colors.text : "rgba(255,255,255,0.75)" }}>
                          {prompt.message}
                        </p>

                        {/* Buttons */}
                        {!answered && (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => handleAnswer(prompt.key, "yes", prompt.ctaAction)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.95]"
                              style={{
                                background: colors.solid,
                                color: "#fff",
                              }}
                            >
                              {prompt.yesLabel || "Yes"}
                            </button>
                            <button
                              onClick={() => handleAnswer(prompt.key, "no")}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.95]"
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                color: "rgba(255,255,255,0.5)",
                              }}
                            >
                              {prompt.noLabel || "Skip"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Submit */}
                <div className="pt-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    className="w-full rounded-xl font-semibold h-12"
                  >
                    {submitting ? "Saving..." : allAnswered ? "Lock It In" : `Answer all ${totalCount} to submit`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
