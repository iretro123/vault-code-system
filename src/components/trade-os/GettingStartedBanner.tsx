import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle2 } from "lucide-react";

type TodayStatus = "incomplete" | "in_progress" | "complete";

interface GettingStartedBannerProps {
  balanceSet: boolean;
  onSetBalance: () => void;
  todayStatus: TodayStatus;
}

export function GettingStartedBanner({ balanceSet, onSetBalance, todayStatus }: GettingStartedBannerProps) {
  const steps = [
    { num: 1, title: "Set your starting balance", desc: "Tell us your current account balance so we can track your progress.", done: balanceSet, active: !balanceSet },
    { num: 2, title: "Log your first trade", desc: "After your next trade, tap the + Log Trade button above.", done: todayStatus !== "incomplete", active: balanceSet && todayStatus === "incomplete" },
    { num: 3, title: "Complete your check-in", desc: "After logging, you'll answer 3 quick questions. Takes 30 seconds.", done: todayStatus === "complete", active: todayStatus === "in_progress" },
  ];

  return (
    <div className="vault-glass-card p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Get Started with My Trades</h3>
        <p className="text-sm text-muted-foreground mt-1">Follow these three steps to begin tracking your trading performance.</p>
      </div>
      <div className="space-y-4">
        {steps.map((s) => (
          <div key={s.num} className={`flex items-start gap-4 ${!s.active && !s.done ? "opacity-40" : ""}`}>
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
              s.done ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : s.active ? "bg-primary/20 border-primary/50 text-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                : "bg-white/5 border-white/10 text-muted-foreground"
            }`}>
              {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.num}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              {s.num === 1 && s.active && (
                <Button size="sm" className="mt-2 gap-1.5" onClick={onSetBalance}>
                  <Wallet className="h-3.5 w-3.5" /> Set Starting Balance
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
