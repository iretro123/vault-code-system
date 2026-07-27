import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AtSign, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isGuestModeEnabled } from "@/lib/featureFlags";
import { enableGuestMode } from "@/lib/guestMode";
import { isNativeCapacitorApp } from "@/lib/platform";

const Auth = () => {
  const { toast } = useToast();
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      window.location.href = "/reset-password" + window.location.hash;
      return;
    }
    // Detect expired/invalid recovery link bounced back by Supabase
    // (e.g. ?error=access_denied&error_code=otp_expired or in hash)
    const search = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errCode = search.get("error_code") || hashParams.get("error_code");
    const errDesc = search.get("error_description") || hashParams.get("error_description");
    if (errCode === "otp_expired" || (errDesc && /expired|invalid/i.test(errDesc))) {
      setMode("forgot");
      setResetError(
        "Your password reset link expired or was already used (this often happens when your email app pre-scans links). Enter your email below and we'll send you a fresh one."
      );
      // Clean the URL so the error doesn't persist on refresh
      window.history.replaceState({}, "", "/auth");
    }
  }, []);

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const REMEMBER_KEY = "vaultos:remembered_email";
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(REMEMBER_KEY) || ""; } catch { return ""; }
  });
  const [rememberMe, setRememberMe] = useState(() => {
    try { return !!localStorage.getItem(REMEMBER_KEY); } catch { return false; }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const result = await signIn(normalizedEmail, password);

    if (result.error) {
      toast({ title: "Error", description: result.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Persist only the normalized email locally (never the password).
    try {
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, normalizedEmail);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* ignore storage errors */ }

    // useAuth's onAuthStateChange handles profile fetch + ban enforcement
    toast({ title: "Welcome back", description: "You have been signed in." });
    navigate("/academy");
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResetError("");
    setResetSent(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setLoading(false);
        setResetError("Failed to send reset link. Please try again.");
        return;
      }

      setLoading(false);
      setResetSent(true);
    } catch (err) {
      console.error("[Reset] Password reset failed:", err);
      setLoading(false);
      setResetError("Something went wrong. Please try again.");
    }
  };

  return (
    <div
      className="academy-main-safe h-[100dvh] overflow-y-auto overflow-x-hidden px-4 py-10"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 40%, rgba(59,130,246,0.10) 0%, transparent 70%),
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.22) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 20% 80%, rgba(59,130,246,0.10) 0%, transparent 50%),
          radial-gradient(ellipse 50% 40% at 80% 70%, rgba(99,102,241,0.08) 0%, transparent 50%),
          radial-gradient(ellipse 40% 30% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 60%),
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
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tight">
            <span className="text-foreground">VAULT</span>
            <span className="text-primary">OS</span>
          </h1>
        </div>

        {mode === "forgot" ? (
          <div className="rounded-2xl border border-border/40 bg-card p-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <p className="text-center text-sm text-muted-foreground mb-6">
              Enter your email to receive a reset link
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              {/* Email */}
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setResetError(""); setResetSent(false); }}
                  className="h-12 pl-10 bg-muted/50 border-border/40 rounded-xl text-sm"
                  required
                />
              </div>

              {resetSent && (
                <div className="flex items-start gap-1.5 text-xs text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Password reset email sent. Check your inbox.</span>
                </div>
              )}
              {resetError && (
                <div className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl gap-2" disabled={loading || !email.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send Reset Link <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-5">
              <button type="button" onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }} className="text-primary hover:underline font-medium">
                Back to sign in
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/40 bg-card p-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="relative">
                  <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10 bg-muted/50 border-border/40 rounded-xl text-sm"
                    required
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 pr-11 bg-muted/50 border-border/40 rounded-xl text-sm"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Forgot password */}
                <div className="text-right">
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl gap-2" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                  ) : (
                    <>Sign In <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </form>


              <p className="text-center text-sm text-muted-foreground mt-5">
                First time here?{" "}
                <Link
                  to={isNativeCapacitorApp() ? "/create-account/full" : "/signup"}
                  className="text-primary hover:underline font-medium"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </>
        )}

        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 pt-8">
          Powered by Vault Trading Academy
        </p>
      </div>
    </div>
  );
};

export default Auth;
