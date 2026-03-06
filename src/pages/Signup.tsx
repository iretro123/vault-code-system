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
import { ensureProfile } from "@/lib/ensureProfile";
import { getStoredReferral, clearStoredReferral } from "@/lib/referralCapture";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

const Signup = () => {
  const { toast } = useToast();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Membership verification
  const [stripeStatus, setStripeStatus] = useState<"idle" | "checking" | "found" | "not_found">("idle");

  // Signup fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "taken" | "available">("idle");

  // Debounced membership check
  useEffect(() => {
    if (!email.trim()) { setStripeStatus("idle"); return; }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) { setStripeStatus("idle"); return; }
    setStripeStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/check-stripe-customer`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: trimmed }) }
        );
        const data = await res.json();
        setStripeStatus(data.found ? "found" : "not_found");
      } catch {
        setStripeStatus("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [email]);

  // Debounced username check
  useEffect(() => {
    if (!username.trim()) { setUsernameStatus("idle"); return; }
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
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast({ title: "Phone required", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    if (usernameStatus === "taken") {
      toast({ title: "Username taken", description: "Please choose a different username.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const result = await signUp(email, password);

    if (result.error) {
      toast({ title: "Error", description: result.error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created", description: "Welcome to Vault Academy." });

      const { data: sessionData } = await supabase.auth.getSession();
      const newUserId = sessionData?.session?.user?.id;
      if (newUserId) {
        await ensureProfile(newUserId, email, {
          phone_number: phoneNumber.trim(),
          username: username.trim().toLowerCase() || undefined,
        });
      }

      // Referral attribution
      const savedRef = getStoredReferral();
      if (savedRef) {
        try {
          const { data: updated } = await supabase
            .from("referrals" as any)
            .update({ referred_user_id: newUserId || null, referred_email: email, status: "signed_up" } as any)
            .eq("referrer_user_id", savedRef)
            .eq("status", "clicked")
            .is("referred_user_id", null)
            .select("id")
            .limit(1);

          if (!updated || (updated as any[]).length === 0) {
            await supabase.from("referrals" as any).insert({
              referrer_user_id: savedRef,
              referred_user_id: newUserId || null,
              referred_email: email,
              status: "signed_up",
            } as any);
          }
          clearStoredReferral();
        } catch (e) {
          console.error("[Referral] signup attribution error:", e);
        }
      }

      // Auto-provision access for whitelisted users (also marks claimed=true server-side)
      if (newUserId) {
        try {
          const { data: { session: provSession } } = await supabase.auth.getSession();
          const provRes = await fetch(
            `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/provision-manual-access`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(provSession?.access_token ? { "Authorization": `Bearer ${provSession.access_token}` } : {}),
              },
              body: JSON.stringify({ email: email.trim().toLowerCase(), auth_user_id: newUserId }),
            }
          );
          const provData = await provRes.json();
          if (provData.error) {
            console.error("[Signup] provision error:", provData.error);
            toast({ title: "Access setup issue", description: "Your account was created but access provisioning failed. Please contact support.", variant: "destructive" });
          }
        } catch (e) {
          console.error("[Signup] provision-manual-access error:", e);
        }
      }

      // Clear stale access cache so fresh state is fetched
      localStorage.removeItem("va_cache_student_access");

      navigate("/hub");
    }

    setLoading(false);
  };

  const fieldsValid = phoneNumber.trim().length > 0 && usernameStatus !== "taken" && stripeStatus === "found";

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
            <p className="text-muted-foreground text-sm mt-1">Create your account</p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                <div className="relative">
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-12 pr-8" required />
                  {stripeStatus === "checking" && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 animate-spin text-muted-foreground" />}
                  {stripeStatus === "found" && <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 text-emerald-500" />}
                  {stripeStatus === "not_found" && <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 text-destructive" />}
                </div>
                {stripeStatus === "found" && (
                  <p className="text-xs text-emerald-500 mt-1">Membership verified</p>
                )}
                {stripeStatus === "not_found" && (
                  <p className="text-xs text-destructive mt-1">This email is not registered with Vault Academy. Contact support.</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-12" required minLength={8} />
              </div>

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

              <Button type="submit" className="w-full h-12 text-base font-medium" disabled={loading || !fieldsValid}>
                {loading ? "Loading..." : "Create Account"}
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?
            <Link to="/auth" className="text-primary hover:underline ml-1 font-medium">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Signup;
