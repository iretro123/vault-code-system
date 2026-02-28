import { useState, useEffect, useCallback } from "react";
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
import { ensureProfile } from "@/lib/ensureProfile";
import { getStoredReferral, clearStoredReferral } from "@/lib/referralCapture";

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

  // Signup-only fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "taken" | "available">("idle");

  // Referral capture now handled globally in App.tsx via ReferralCapture component

  // Debounced username uniqueness check
  useEffect(() => {
    if (mode !== "signup" || !username.trim()) {
      setUsernameStatus("idle");
      return;
    }
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", trimmed)
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [username, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !phoneNumber.trim()) {
      toast({ title: "Phone required", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    if (mode === "signup" && usernameStatus === "taken") {
      toast({ title: "Username taken", description: "Please choose a different username.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const result = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);

    const error = result.error;

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: mode === "signup" ? "Account created" : "Welcome back",
        description: mode === "signup" ? "Check your email to verify your account." : "You have been signed in.",
      });

      if (mode === "signup") {
        // Create profile with phone + username
        const { data: sessionData } = await supabase.auth.getSession();
        const newUserId = sessionData?.session?.user?.id;
        if (newUserId) {
          await ensureProfile(newUserId, email, {
            phone_number: phoneNumber.trim(),
            username: username.trim().toLowerCase() || undefined,
          });
        }

        // Record referral attribution
        const savedRef = getStoredReferral();
        console.log("[Referral] signup attribution check:", savedRef ? savedRef : "none");
        if (savedRef) {
          try {
            // Try upgrading an existing "clicked" row first
            const { data: updated } = await supabase
              .from("referrals" as any)
              .update({ referred_user_id: newUserId || null, referred_email: email, status: "signed_up" } as any)
              .eq("referrer_user_id", savedRef)
              .eq("status", "clicked")
              .is("referred_user_id", null)
              .select("id")
              .limit(1);

            if (updated && (updated as any[]).length > 0) {
              console.log("[Referral] upgraded clicked -> signed_up for:", savedRef);
            } else {
              // No clicked row found — insert fresh
              await supabase.from("referrals" as any).insert({
                referrer_user_id: savedRef,
                referred_user_id: newUserId || null,
                referred_email: email,
                status: "signed_up",
              } as any);
              console.log("[Referral] inserted new signed_up row for:", savedRef);
            }
            clearStoredReferral();
          } catch (e) {
            console.error("[Referral] signup attribution error:", e);
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

  const signupFieldsValid = mode !== "signup" || (phoneNumber.trim().length > 0 && usernameStatus !== "taken");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">VAULT OS</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
            </p>
          </div>

          {mode === "forgot" ? (
            <Card className="p-6">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email" className="text-sm text-muted-foreground">Email</Label>
                  <Input id="reset-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setResetError(""); setResetSent(false); }} className="mt-1.5 h-12" required />
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
                <Button type="submit" className="w-full h-12 text-base font-medium gap-2" disabled={loading || !email.trim()}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button type="button" onClick={() => { setMode("login"); setResetSent(false); setResetError(""); }} className="text-primary hover:underline font-medium">Back to sign in</button>
              </p>
            </Card>
          ) : (
            <>
              <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-12" required />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
                      {mode === "login" && (
                        <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">Forgot password?</button>
                      )}
                    </div>
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-12" required minLength={8} />
                  </div>

                  {mode === "signup" && (
                    <>
                      <div>
                        <Label htmlFor="phone" className="text-sm text-muted-foreground">
                          Phone Number <span className="text-destructive">*</span>
                        </Label>
                        <Input id="phone" type="tel" placeholder="+1 555 000 0000" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="mt-1.5 h-12" required maxLength={20} />
                        <p className="text-[10px] text-muted-foreground/60 mt-1">For important account alerts only.</p>
                      </div>

                      <div>
                        <Label htmlFor="username" className="text-sm text-muted-foreground">
                          Username <span className="text-muted-foreground/50">(optional)</span>
                        </Label>
                        <div className="relative">
                          <Input id="username" placeholder="trader_one" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} className="mt-1.5 h-12 pr-8" maxLength={30} />
                          {usernameStatus === "checking" && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 animate-spin text-muted-foreground" />}
                          {usernameStatus === "available" && <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 text-emerald-500" />}
                          {usernameStatus === "taken" && <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 text-destructive" />}
                        </div>
                        {usernameStatus === "taken" && <p className="text-xs text-destructive mt-1">Username is already taken.</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Cannot be changed after registration.</p>
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading || !signupFieldsValid}>
                    {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
                  </Button>
                </form>
              </Card>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary hover:underline ml-1 font-medium">
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