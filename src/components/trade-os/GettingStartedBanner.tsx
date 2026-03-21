import { useState } from "react";
import { CheckCircle2, Shield, Brain, Zap, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type TodayStatus = "incomplete" | "in_progress" | "complete";

interface GettingStartedBannerProps {
  balanceSet: boolean;
  onSetBalance: () => void;
  todayStatus: TodayStatus;
  onDismiss?: () => void;
}

export function GettingStartedBanner({ balanceSet, onSetBalance, todayStatus, onDismiss }: GettingStartedBannerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const steps = [
    {
      num: 1,
      icon: Shield,
      title: "Balance locked in",
      desc: "Your starting point is set. The OS is tracking from here.",
      done: balanceSet,
      active: !balanceSet,
    },
    {
      num: 2,
      icon: Zap,
      title: "Open this before every trade",
      desc: "Use your Trading OS before you enter any position. Review your limits, check your mindset, and let the system keep you accountable. This is your edge.",
      done: todayStatus !== "incomplete",
      active: balanceSet && todayStatus === "incomplete",
    },
    {
      num: 3,
      icon: Brain,
      title: "Meet your AI Coach",
      desc: "Built into every session is an AI coach that studies your behavior, spots your blind spots, and helps you eliminate bad habits. The more you trade, the smarter it gets. It learns YOU — and pushes you to become the disciplined trader you're meant to be.",
      done: todayStatus === "complete",
      active: todayStatus === "in_progress",
    },
  ];

  const handleConfirmDismiss = () => {
    if (confirmText.trim().toUpperCase() !== "CONFIRM") return;
    setShowConfirm(false);
    setConfirmText("");
    onDismiss?.();
  };

  return (
    <>
      <div className="vault-glass-card p-6 space-y-5 relative">
        {onDismiss && (
          <button
            onClick={() => setShowConfirm(true)}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss getting started guide"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Your Trading OS is Active
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed pr-6">
            This system learns how you trade — your patterns, your habits, your mindset. Every session makes it sharper. You're not doing this alone anymore.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className={`flex items-start gap-4 ${!s.active && !s.done ? "opacity-40" : ""}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  s.done
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : s.active
                      ? "bg-primary/20 border-primary/50 text-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                      : "bg-muted/10 border-border text-muted-foreground"
                }`}>
                  {s.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground/70 text-center pt-1 italic">
          Consistency is the cheat code. Show up every day and watch this system transform your trading.
        </p>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide Getting Started Guide?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block text-sm text-muted-foreground">
                This will permanently hide the Getting Started guide from your Trading OS. Make sure you've completed all steps before dismissing.
              </span>
              <span className="block text-xs text-destructive font-medium">
                ⚠️ This action cannot be undone.
              </span>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "CONFIRM" to proceed'
                className="w-full mt-2 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmText(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDismiss}
              disabled={confirmText.trim().toUpperCase() !== "CONFIRM"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Dismiss Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
