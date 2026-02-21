import { useNavigate } from "react-router-dom";
import { Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CoachCard() {
  const navigate = useNavigate();

  const openCoach = () => {
    window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
  };

  return (
    <div
      className="vault-glass-card p-6 md:p-8 space-y-5"
      style={{
        background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0.06) 100%)",
      }}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">
            Meet Your Personal Trading Coach
          </h2>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 status-dot-active" />
            <span className="text-xs font-medium text-emerald-400">Available now</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Fix the leaks in your trading. Get personalized feedback from a mentor or instant answers from our AI trading assistant.
      </p>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button onClick={openCoach} className="gap-2 h-11 flex-1">
          <Sparkles className="h-4 w-4" />
          Create your personalized gameplan
        </Button>
        <Button onClick={openCoach} variant="outline" className="gap-2 h-11">
          <MessageSquare className="h-4 w-4" />
          Ask Coach Now
        </Button>
      </div>
    </div>
  );
}
