import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check URL hash for recovery token (most reliable — handles race condition)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Fallback: session already exists (token consumed during redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
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
        ) : !ready ? (
          <Card className="p-6 text-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
            <p className="text-xs text-muted-foreground">If this takes too long, the link may have expired. <button onClick={() => navigate("/auth")} className="text-primary hover:underline">Request a new one.</button></p>
          </Card>
        ) : (
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="new-password" className="text-sm text-muted-foreground">New Password</Label>
                <Input id="new-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-12" required minLength={8} />
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirm Password</Label>
                <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1.5 h-12" required minLength={8} />
              </div>
              {error && (
                <div className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full h-12 text-base font-medium gap-2" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
