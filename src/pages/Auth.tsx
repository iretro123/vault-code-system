import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  // Persist ref code from URL
  const refCode = searchParams.get("ref");
  useEffect(() => {
    if (refCode) {
      sessionStorage.setItem("vault_ref", refCode);
    }
  }, [refCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: mode === "signup" ? "Account created" : "Welcome back",
        description: mode === "signup" ? "Check your email to verify your account." : "You have been signed in.",
      });

      // Record referral on signup
      if (mode === "signup") {
        const savedRef = sessionStorage.getItem("vault_ref");
        if (savedRef) {
          try {
            // Get the newly created user
            const { data: sessionData } = await supabase.auth.getSession();
            const newUserId = sessionData?.session?.user?.id;
            await supabase.from("referrals" as any).insert({
              referrer_user_id: savedRef,
              referred_user_id: newUserId || null,
              referred_email: email,
              status: "signed_up",
            } as any);
            sessionStorage.removeItem("vault_ref");
          } catch (e) {
            // Silently fail - don't block signup
            console.error("Referral tracking error:", e);
          }
        }
      }

      if (mode === "login") navigate("/hub");
    }

    setLoading(false);
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResetError("");
    setResetSent(false);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });

    setLoading(false);
    if (error) {
      setResetError(error.message);
    } else {
      setResetSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">VAULT OS</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
            </p>
          </div>

          {/* Forgot Password Form */}
          {mode === "forgot" ? (
            <Card className="p-6">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email" className="text-sm text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setResetError(""); setResetSent(false); }}
                    className="mt-1.5 h-12"
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
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium gap-2"
                  disabled={loading || !email.trim()}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }}
                  className="text-primary hover:underline font-medium"
                >
                  Back to sign in
                </button>
              </p>
            </Card>
          ) : (
            <>
              {/* Login / Signup Form */}
              <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5 h-12"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm text-muted-foreground">
                        Password
                      </Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1.5 h-12"
                      required
                      minLength={8}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium"
                    disabled={loading}
                  >
                    {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
                  </Button>
                </form>
              </Card>

              {/* Toggle Mode */}
              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-primary hover:underline ml-1 font-medium"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Auth;