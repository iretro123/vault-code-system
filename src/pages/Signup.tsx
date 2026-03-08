import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const [stripeStatus, setStripeStatus] = useState<"idle" | "checking" | "found" | "not_found">("idle");
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
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Name required", description: "Please enter your first and last name.", variant: "destructive" });
      return;
    }
    if (username.trim().length < 3) {
      toast({ title: "Username required", description: "Username must be at least 3 characters.", variant: "destructive" });
      return;
    }
    if (usernameStatus === "taken") {
      toast({ title: "Username taken", description: "Please choose a different username.", variant: "destructive" });
      return;
    }
    if (!phoneNumber.trim()) {
      toast({ title: "Phone required", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure your passwords match.", variant: "destructive" });
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
          username: username.trim().toLowerCase(),
          display_name: `${firstName.trim()} ${lastName.trim()}`,
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

      // Auto-provision access for whitelisted users
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

      localStorage.removeItem("va_cache_student_access");
      navigate("/academy");
    }

    setLoading(false);
  };

  const fieldsValid =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    username.trim().length >= 3 &&
    usernameStatus !== "taken" &&
    phoneNumber.trim().length > 0 &&
    stripeStatus === "found" &&
    password.length >= 8 &&
    password === confirmPassword;

  const inputClass = "h-10 rounded-lg bg-white/5 border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/40 transition-colors";
  const labelClass = "text-xs font-medium text-white/70 block mb-1";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-3">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-[0.2em]">VAULT OS</h1>
          <p className="text-muted-foreground text-xs mt-1">Join Vault Academy today</p>
        </div>

        {/* Card container */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* First Name / Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  required
                  maxLength={50}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Last Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  required
                  maxLength={50}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className={labelClass}>
                Username <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  placeholder="trader_one"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  className={`${inputClass} pr-9`}
                  required
                  maxLength={30}
                />
                {usernameStatus === "checking" && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {usernameStatus === "available" && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />}
                {usernameStatus === "taken" && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-destructive" />}
              </div>
              {usernameStatus === "taken" && <p className="text-[11px] text-destructive mt-0.5">Username is already taken.</p>}
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>
                Email <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClass} pr-9`}
                  required
                />
                {stripeStatus === "checking" && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {stripeStatus === "found" && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />}
                {stripeStatus === "not_found" && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-destructive" />}
              </div>
              {stripeStatus === "found" && <p className="text-[11px] text-emerald-500 mt-0.5">Membership verified</p>}
              {stripeStatus === "not_found" && <p className="text-[11px] text-destructive mt-0.5">No membership found. Contact support.</p>}
            </div>

            {/* Phone Number */}
            <div>
              <label className={labelClass}>
                Phone Number <span className="text-destructive">*</span>
              </label>
              <Input
                type="tel"
                placeholder="+1 555 000 0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={inputClass}
                required
                maxLength={20}
              />
            </div>

            {/* Password row — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Password <span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Confirm <span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={8}
                />
              </div>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[11px] text-destructive -mt-2">Passwords do not match.</p>
            )}

            {/* Divider */}
            <div className="border-t border-white/[0.06] pt-3.5">
              <Button
                type="submit"
                className="w-full h-10 text-sm font-medium rounded-lg hover:shadow-[0_0_20px_4px_hsl(217_91%_60%/0.15)]"
                disabled={loading || !fieldsValid}
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : "Create Account"}
              </Button>
            </div>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5">
            Already have an account?
            <Link to="/auth" className="text-primary hover:underline ml-1 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
