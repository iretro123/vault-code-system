import { useState } from "react";
import { Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import rzAvatar from "@/assets/rz-avatar.png";

export function CoachCard() {
  const [imgError, setImgError] = useState(false);

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
        <div className="relative shrink-0">
          {!imgError ? (
            <img
              src={rzAvatar}
              alt="RZ"
              onError={() => setImgError(true)}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full object-cover border border-white/15 shadow-md"
            />
          ) : (
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          )}
          <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background status-dot-active" />
        </div>
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">
            Meet Your Personal Trading Coach
          </h2>
          <span className="text-xs font-medium text-emerald-400">Available now</span>
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
