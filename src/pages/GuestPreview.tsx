import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { disableGuestMode, isGuestMode } from "@/lib/guestMode";

/**
 * View-only guest preview. No live sessions, no trade, no chat — just a
 * sign-in/sign-up CTA. Everything is gated behind authentication.
 */
export default function GuestPreview() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isGuestMode()) {
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  const handleExit = () => {
    disableGuestMode();
    window.dispatchEvent(new Event("guest-mode-changed"));
    navigate("/auth", { replace: true });
  };

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59,130,246,0.10) 0%, transparent 70%),
          linear-gradient(180deg, hsl(212,25%,6%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Sign in
          </button>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
            Guest preview
          </span>
        </header>

        {/* Title */}
        <div className="text-center pt-4">
          <h1 className="text-3xl font-black tracking-tight">
            <span className="text-foreground">VAULT</span>
            <span className="text-primary">OS</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            You're previewing the platform as a guest. Browse upcoming live sessions
            below. Full access requires an account.
          </p>
        </div>


        {/* View-only notice */}
        <Card className="p-5 border-primary/20 bg-primary/[0.04]">
          <div className="flex items-start gap-3">
            <div className="shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Guest access is view-only
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Chat, posting, journaling, and community participation are
                disabled. Create an account to join discussions and unlock
                everything.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button asChild className="w-full h-11">
              <Link to="/auth" onClick={handleExit}>Create an account</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
