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
      className="vault-glass-card p-6 md:p-8 space-y-6 rounded-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0.04) 100%)",
      }}
    >
      {/* Header row */}
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
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
              RZ
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

      {/* Founder message */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        I'm RZ, founder of Vault Trading Academy. Vault was built for traders who are done gambling and ready to operate like professionals. We focus on risk control, execution discipline, and structured growth. If you follow the system, track your trades, and stay accountable, results compound. Just process and consistency.
      </p>

      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        We're here to help — ask a mentor for feedback or use Instant AI for a fast answer.
      </p>

      {/* CTAs */}
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
