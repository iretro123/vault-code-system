import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Catch recovery tokens in hash and redirect to reset page
  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      window.location.href = "/reset-password" + window.location.hash;
    }
  }, []);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn(email, password);

    if (result.error) {
      toast({ title: "Error", description: result.error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check if user is revoked/banned before allowing navigation
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("access_status, is_banned")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (profileData?.access_status === "revoked" || profileData?.is_banned) {
        await supabase.auth.signOut();
        toast({ title: "Access Revoked", description: "Your account access has been revoked. Contact support for assistance.", variant: "destructive" });
        setLoading(false);
        return;
      }
    }

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
      const { data, error } = await supabase.functions.invoke("ghl-password-reset", {
        body: { email: email.trim(), origin: window.location.origin },
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
              {mode === "login" ? "Welcome back" : "Reset your password"}
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
                      <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">Forgot password?</button>
                    </div>
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-12" required minLength={8} />
                  </div>

                  <Button type="submit" className="w-full h-12 text-base font-medium gap-2" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Signing in…" : "Sign In"}
                  </Button>
                </form>
              </Card>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an account?
                <Link to="/signup" className="text-primary hover:underline ml-1 font-medium">Sign up</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Auth;
