import { useNavigate } from "react-router-dom";
import { usePlaybookProgress } from "@/hooks/usePlaybookProgress";
import { ArrowRight, Check, Clock } from "lucide-react";
import { VaultPlaybookIcon } from "@/components/icons/VaultPlaybookIcon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function PlaybookCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chapters, progress, completedCount, totalCount, pct, nextChapter, loading } = usePlaybookProgress();
  const [snoozed, setSnoozed] = useState(false);

  // Check snooze state
  useEffect(() => {
    if (!user) return;
    supabase.from("user_nudges_dismissed")
      .select("dismissed_until")
      .eq("user_id", user.id)
      .eq("nudge_key", "playbook_continue")
      .maybeSingle()
      .then(({ data }) => {
        if (data && new Date(data.dismissed_until) > new Date()) {
          setSnoozed(true);
        }
      });
  }, [user]);

  const snooze = async (days: number) => {
    if (!user) return;
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase.from("user_nudges_dismissed")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("nudge_key", "playbook_continue")
      .maybeSingle();

    if (existing) {
      await supabase.from("user_nudges_dismissed")
        .update({ dismissed_until: until })
        .eq("user_id", user.id)
        .eq("nudge_key", "playbook_continue");
    } else {
      await supabase.from("user_nudges_dismissed")
        .insert({ user_id: user.id, nudge_key: "playbook_continue", dismissed_until: until });
    }
    setSnoozed(true);
  };

  // Hide completely only when we KNOW there's nothing to show (not during load)
  if (totalCount === 0 && !loading) return null;
  if (snoozed) return null;
  // Show skeleton while loading to reserve layout space
  if (loading) {
    return (
      <div className="vault-glass-card p-6 space-y-4 animate-pulse" style={{ minHeight: 160 }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-white/[0.06]" />
            <div className="h-3 w-48 rounded bg-white/[0.04]" />
          </div>
        </div>
        <div className="h-2 w-full rounded bg-white/[0.04]" />
        <div className="h-9 w-full rounded-lg bg-white/[0.04]" />
      </div>
    );
  }

  const hasStarted = completedCount > 0 || Object.keys(progress).length > 0;
  const isComplete = completedCount === totalCount;

  const totalMinutes = chapters.reduce((s, c) => s + c.minutes_estimate, 0);

  return (
    <div className="vault-glass-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <VaultPlaybookIcon className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Vault Playbook</h3>
            <p className="text-xs text-white/30">Your Trading Operating System</p>
          </div>
        </div>

        {!isComplete && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => snooze(1)}
              className="text-[10px] text-white/15 hover:text-white/30 px-2 py-1 rounded transition-colors"
            >
              Snooze
            </button>
          </div>
        )}
      </div>

      {isComplete ? (
        /* Completed state */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400/80">Completed</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2"
            onClick={() => navigate("/academy/playbook")}
          >
            Review Playbook
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : hasStarted ? (
        /* In progress state */
        <div className="space-y-3">
          {nextChapter && (
            <p className="text-sm text-white/50">
              Continue: <span className="text-foreground/80 font-medium">{nextChapter.title}</span>
              <span className="text-white/25 ml-1">({nextChapter.minutes_estimate} min)</span>
            </p>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/25">{completedCount}/{totalCount} chapters</span>
              <span className="text-xs font-medium text-foreground/70">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={() => navigate(`/academy/playbook${nextChapter ? `?chapter=${nextChapter.id}` : ""}`)}
          >
            Continue Reading
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        /* Never started */
        <div className="space-y-3">
          <p className="text-sm text-white/50">
            Start the Vault Operating System
            <span className="text-white/25 ml-1">({totalMinutes} min)</span>
          </p>
          <p className="text-xs text-white/20">
            Complete Chapters 1–2 to unlock posting setups.
          </p>
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={() => navigate("/academy/playbook")}
          >
            Start Playbook
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
