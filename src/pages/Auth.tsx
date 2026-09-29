import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AtSign, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle, UserRound, UserPlus, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthBackButton } from "@/components/auth/AuthBackButton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isGuestModeEnabled } from "@/lib/featureFlags";
import { enableGuestMode } from "@/lib/guestMode";
import { isNativeCapacitorApp } from "@/lib/platform";
import "./welcome.css";
import "./auth.css";

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
    navigate(new URLSearchParams(window.location.search).get("resume") === "membership"
      ? "/academy?checkout=success" : "/academy");
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
      className="academy-main-safe vault-entry vault-login"
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
        paddingLeft: "max(env(safe-area-inset-left, 0px), 1rem)",
        paddingRight: "max(env(safe-area-inset-right, 0px), 1rem)",
        minHeight: "var(--academy-visible-height, 100dvh)",
        boxSizing: "border-box",
      }}
    >
      <div className="vault-entry-shell">
        <header className="vault-entry-header">
          <AuthBackButton fallback="/welcome" />
          <Link to="/welcome" className="vault-login-brand vault-entry-brand" aria-label="Vault OS welcome">VAULT <b>OS</b></Link>
        </header>
        <section className="vault-login-content">
          <div className="vault-entry-title vault-login-title">
            <span className="vault-login-eyebrow">MEMBER LOGIN</span>
            <h1>{mode === "forgot" ? "Let's get you back in." : <>Welcome<br/><span>back.</span></>}</h1>
            <p>{mode === "forgot" ? "We'll send a reset link to your account email." : "Sign in to your Vault account."}</p>
          </div>

        {mode === "forgot" ? (
          <div className="vault-login-card">

            <form onSubmit={handleForgotPassword} className="space-y-5">
              {/* Email */}
              <div className="vault-login-field">
                <label htmlFor="reset-email">Email</label>
                <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  id="reset-email"
                  name="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  inputMode="email"
                  spellCheck={false}
                  placeholder="Email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setResetError(""); setResetSent(false); }}
                  className="h-12 pl-10 bg-muted/50 border-border/40 rounded-xl text-sm"
                  required
                />
                </div>
              </div>

              {resetSent && (
                <div role="status" className="vault-login-notice">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Password reset email sent. Check your inbox.</span>
                </div>
              )}
              {resetError && (
                <div role="alert" className="vault-login-notice vault-login-notice--error">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <Button type="submit" className="vault-entry-button" disabled={loading || !email.trim()}>
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
            <div className="vault-login-card">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="vault-login-field">
                  <label htmlFor="login-email">Email</label>
                  <div className="relative">
                  <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    id="login-email"
                    name="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10 bg-muted/50 border-border/40 rounded-xl text-sm"
                    required
                    autoComplete="username"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  </div>
                </div>

                {/* Password */}
                <div className="vault-login-field">
                  <label htmlFor="login-password">Password</label>
                  <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="login-password"
                    name="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 pr-11 bg-muted/50 border-border/40 rounded-xl text-sm"
                    required
                    minLength={8}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  </div>
                </div>

                {/* Remember me + Forgot password */}
                <div className="vault-login-options">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setRememberMe(next);
                        try {
                          if (!next) localStorage.removeItem(REMEMBER_KEY);
                          else if (email.trim()) localStorage.setItem(REMEMBER_KEY, email.trim().toLowerCase());
                        } catch { /* ignore */ }
                      }}
                      className="h-4 w-4 rounded border-border/60 bg-muted/50 text-primary focus:ring-1 focus:ring-primary/50 cursor-pointer"
                      aria-label="Remember email on this device"
                    />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      Remember email
                    </span>
                  </label>
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <Button type="submit" className="vault-entry-button" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                  ) : (
                    <>Sign In <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </form>


            </div>
          </>
        )}
        </section>
        <footer className="vault-entry-footer">Vault Trading Academy</footer>
      </div>
    </div>
  );
};

export default Auth;
