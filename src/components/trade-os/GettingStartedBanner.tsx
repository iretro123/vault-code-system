import { CheckCircle2, Shield, Brain, Zap } from "lucide-react";

type TodayStatus = "incomplete" | "in_progress" | "complete";

interface GettingStartedBannerProps {
  balanceSet: boolean;
  onSetBalance: () => void;
  todayStatus: TodayStatus;
}

export function GettingStartedBanner({ balanceSet, onSetBalance, todayStatus }: GettingStartedBannerProps) {
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

  return (
    <div className="vault-glass-card p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Your Trading OS is Active
        </h3>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
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
  );
}
