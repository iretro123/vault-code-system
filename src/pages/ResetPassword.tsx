import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthChecklist, isPasswordStrong } from "@/components/PasswordStrengthChecklist";

// Module-level guard: a recovery token_hash can only be redeemed ONCE.
// Without this, a remount (or double effect run) burns the token and the
// second call fails with "One-time token not found".
let redeemedToken: string | null = null;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Primary: read token_hash from query params (direct link, bypasses Supabase redirect)
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    if (tokenHash && type === "recovery") {
      if (redeemedToken === tokenHash) {
        // Already redeemed in this browsing session — trust the existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) setReady(true);
          else setError("This reset link was already used. Please request a new one.");
        });
        return;
      }
      redeemedToken = tokenHash;
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(async ({ error: otpError }) => {
          if (!otpError) {
            setReady(true);
            return;
          }
          // The token may have been consumed already (double request) — if a
          // recovery session exists we can still let them set a password.
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setReady(true);
          } else {
            setError("This reset link is invalid, already used, or expired. Please request a new one.");
          }
        });
      return; // no cleanup needed
    }

    // Fallback: check hash fragment (legacy links)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Fallback: session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isPasswordStrong(password, confirmPassword)) {
      setError("Please meet all password requirements below before continuing.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      // Translate Supabase's HIBP / weak-password error into clearer guidance
      const msg = updateError.message || "";
      if (/weak|known|leaked|pwned|easy to guess/i.test(msg)) {
        setError(
          "This password has shown up in known data breaches. Pick something more unique — try a short phrase with numbers and a symbol (e.g. 'Coffee@Sunrise47')."
        );
      } else {
        setError(msg);
      }
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/auth"), 2500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Reset Password</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter your new password below.</p>
        </div>

        {success ? (
          <Card className="p-6 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm text-foreground font-medium">Password updated successfully.</p>
            <p className="text-xs text-muted-foreground">Redirecting to sign in…</p>
          </Card>
        ) : !ready && error ? (
          <Card className="p-6 text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-foreground font-medium">Reset link no longer valid</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button className="w-full h-12" onClick={() => navigate("/auth?reset=1")}>
              Request a new reset link
            </Button>
          </Card>
        ) : !ready ? (
          <Card className="p-6 text-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
            <p className="text-xs text-muted-foreground">If this takes too long, the link may have expired. <button onClick={() => navigate("/auth?reset=1")} className="text-primary hover:underline">Request a new one.</button></p>

          </Card>
        ) : (
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="new-password" className="text-sm text-muted-foreground">New Password</Label>
                <Input id="new-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-12" required minLength={10} autoFocus />
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirm Password</Label>
                <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1.5 h-12" required minLength={10} />
              </div>

              <PasswordStrengthChecklist password={password} confirmPassword={confirmPassword} />

              {error && (
                <div className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium gap-2"
                disabled={loading || !isPasswordStrong(password, confirmPassword)}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPasswordStrong(password, confirmPassword) ? "Update Password" : "Meet all requirements to continue"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
