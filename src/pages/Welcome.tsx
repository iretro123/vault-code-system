import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, UserRound } from "lucide-react";
import { isGuestModeEnabled } from "@/lib/featureFlags";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-6 py-10"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 40%, rgba(59,130,246,0.10) 0%, transparent 70%),
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.22) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 20% 80%, rgba(59,130,246,0.10) 0%, transparent 50%),
          radial-gradient(ellipse 50% 40% at 80% 70%, rgba(99,102,241,0.08) 0%, transparent 50%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      <div className="flex-1 w-full flex flex-col items-center justify-center max-w-md">
        {/* Logo */}
        <h1 className="text-6xl font-black tracking-tight text-center animate-fade-in">
          <span className="text-foreground">VAULT</span>
          <span className="text-primary">OS</span>
        </h1>

        <p className="mt-5 text-center text-base text-muted-foreground max-w-xs leading-relaxed">
          Welcome to Vault OS.
        </p>
        <p className="mt-2 text-center text-lg font-medium text-foreground/90 max-w-xs leading-snug">
          Join a team of serious traders.
        </p>

        {/* CTAs */}
        <div className="w-full mt-12 space-y-3">
          <Button
            onClick={() => navigate("/create-account/full")}
            className="w-full h-14 text-base font-semibold rounded-2xl gap-2"
          >
            Full Access {`$99/month`}
            <Sparkles className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => navigate("/intro?next=signup")}
            className="w-full h-14 text-base font-semibold rounded-2xl gap-2"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>

          {isGuestModeEnabled() && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-sm font-medium rounded-2xl gap-2"
              onClick={() => navigate("/intro?next=guest")}
            >
              <UserRound className="h-4 w-4" />
              Continue as Guest
            </Button>
          )}

          <p className="text-center text-sm text-muted-foreground pt-2">
            Need full access?{" "}
            <Link to="/create-account/full" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
            <span className="mx-2 text-muted-foreground/50">•</span>
            Already have an account?{" "}
            <Link to="/auth" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 pt-8">
        Powered by Vault Trading Academy
      </p>
    </div>
  );
};

export default Welcome;
