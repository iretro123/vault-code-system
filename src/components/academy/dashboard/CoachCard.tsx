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
      className="vault-luxury-card p-6 md:p-8 space-y-6 transition-all duration-200"
      style={{
        background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.04) 50%, rgba(255,255,255,0.03) 100%)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(59,130,246,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; }}
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
        I'm RZ, founder of Vault Trading Academy, and I'm here to help you operate like a professional trader. Whether you're learning the foundations or refining your edge, I'll guide you through building disciplined risk systems, structured trade execution, and consistent performance habits that compound over time.
      </p>

      <p className="text-xs text-muted-foreground/70 leading-relaxed">
        We're here to help — ask for feedback or get an instant AI answer anytime.
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
