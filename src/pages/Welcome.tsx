import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gem, UserRound } from "lucide-react";
import {
  VAULT_OS_MONTHLY_FALLBACK_PRICE,
  VAULT_OS_PRIVACY_POLICY_URL,
  VAULT_OS_TERMS_URL,
} from "@/lib/membership";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div
      className="academy-main-safe h-[100dvh] overflow-y-auto overflow-x-hidden px-6 py-10"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 40%, rgba(59,130,246,0.10) 0%, transparent 70%),
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.22) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 20% 80%, rgba(59,130,246,0.10) 0%, transparent 50%),
          radial-gradient(ellipse 50% 40% at 80% 70%, rgba(99,102,241,0.08) 0%, transparent 50%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        overscrollBehaviorY: "contain",
        paddingTop: "max(env(safe-area-inset-top, 0px), 2rem)",
        paddingBottom: "calc(max(env(safe-area-inset-bottom, 0px), 1rem) + 1.5rem)",
        minHeight: "100dvh",
        boxSizing: "border-box",
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center">
        {/* Logo */}
        <h1 className="text-6xl font-black tracking-tight text-center animate-fade-in">
          <span className="text-foreground">VAULT</span>
          <span className="text-primary">OS</span>
        </h1>

        <p className="mt-5 text-center text-base text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Welcome to Vault OS.
        </p>
        <p className="mt-2 text-center text-lg font-medium text-foreground/90 max-w-xs mx-auto leading-snug">
          Join a team of serious traders.
        </p>

        {/* CTAs */}
        <div className="mt-14 w-full max-w-[23rem] mx-auto space-y-8">
          <div className="space-y-2">
            <Button
              onClick={() => navigate("/create-account/full")}
              className="w-full h-16 text-base font-semibold rounded-2xl gap-3"
            >
              <Gem className="h-5 w-5 shrink-0" />
              View Full Access - {VAULT_OS_MONTHLY_FALLBACK_PRICE.replace("/month", "/mo")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Live calls, training, tools, and community.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full h-16 text-base font-semibold rounded-2xl gap-3"
              onClick={() => navigate("/create-account")}
            >
              <UserRound className="h-5 w-5 shrink-0" />
              Create Free Account
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Join the free community.
            </p>
          </div>

          <p className="text-center text-base font-semibold text-foreground pt-1">
            Already have an account?{" "}
            <Link
              to="/auth"
              className="font-bold text-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.45)] hover:text-[#6ea8ff] hover:drop-shadow-[0_0_14px_rgba(59,130,246,0.7)] transition-all"
            >
              Log in
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/90">
            <button
              type="button"
              onClick={() => navigate("/membership")}
              className="hover:text-foreground transition-colors"
            >
              Restore Apple Purchase
            </button>
            {" · "}
            <a
              href={VAULT_OS_TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </a>
            {" · "}
            <a
              href={VAULT_OS_PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </a>
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
