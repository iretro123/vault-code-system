import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, FileText } from "lucide-react";
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
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [agreementDraftChecked, setAgreementDraftChecked] = useState(false);
  const ipRef = useRef<string | null>(null);

  // Best-effort IP fetch
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then(r => r.json())
      .then(d => { ipRef.current = d.ip; })
      .catch(() => {});
  }, []);

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

        // Record agreement acceptance
        try {
          await supabase.from("agreement_acceptances" as any).insert({
            user_id: newUserId,
            agreement_version: "1.0",
            ip_address: ipRef.current,
          } as any);
        } catch (e) {
          console.error("[Signup] agreement acceptance error:", e);
        }
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
    password === confirmPassword &&
    agreementChecked;

  const inputClass = "h-12 bg-muted/50 border-border/40 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/40 transition-colors";
  const labelClass = "text-xs font-medium text-white/70 block mb-1";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-6"
      style={{
        background: `
          radial-gradient(ellipse 70% 50% at 50% 40%, rgba(59,130,246,0.10) 0%, transparent 70%),
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.22) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 20% 80%, rgba(59,130,246,0.10) 0%, transparent 50%),
          radial-gradient(ellipse 50% 40% at 80% 70%, rgba(99,102,241,0.08) 0%, transparent 50%),
          radial-gradient(ellipse 40% 30% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 60%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tight">
            <span className="text-foreground">VAULT</span>
            <span className="text-primary">OS</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Join Vault Academy</p>
        </div>

        {/* Card container */}
        <div className="rounded-2xl border border-border/40 bg-card p-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
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

            {/* Agreement Launcher */}
            <div
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] cursor-pointer group hover:border-primary/20 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_20px_rgba(59,130,246,0.06),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200"
              onClick={() => { if (!agreementChecked) { setAgreementDraftChecked(false); setAgreementModalOpen(true); } }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {agreementChecked ? (
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/15 shadow-[0_0_12px_rgba(16,185,129,0.15)] flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.12)] transition-all duration-200">
                      <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Important Agreement</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {agreementChecked ? (
                        <span className="text-emerald-400/90 font-medium">✓ Agreement accepted</span>
                      ) : (
                        "Required before creating your account"
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={agreementChecked ? "ghost" : "outline"}
                  size="sm"
                  className={`shrink-0 text-xs rounded-lg h-9 px-4 font-semibold ${agreementChecked ? "text-emerald-400 hover:text-emerald-300" : "border-white/[0.12] bg-white/[0.04] hover:border-primary/30 hover:bg-primary/10 hover:text-primary"}`}
                  onClick={(e) => { e.stopPropagation(); setAgreementDraftChecked(agreementChecked); setAgreementModalOpen(true); }}
                >
                  {agreementChecked ? "View Again" : "Review & Accept"}
                </Button>
              </div>
            </div>

            {/* Agreement Modal */}
            <Dialog open={agreementModalOpen} onOpenChange={setAgreementModalOpen}>
              <DialogContent className="max-w-[92vw] sm:max-w-lg max-h-[85vh] p-0 gap-0 border-white/[0.08] bg-[hsl(220,20%,8%)] shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_60px_rgba(59,130,246,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl overflow-hidden backdrop-blur-xl">
                {/* Modal Header */}
                <div className="px-6 pt-6 pb-4 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-primary/15 shadow-[0_0_20px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                      <ShieldCheck className="h-5.5 w-5.5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-foreground tracking-tight">Important Agreement</h2>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">Please read carefully before proceeding</p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Legal Text */}
                <ScrollArea className="h-[40vh] max-h-[320px]">
                  <div className="px-6 py-4 bg-black/20">
                    <p className="text-[11.5px] leading-[1.75] text-muted-foreground/90">
                      By creating an account and using Vault Trading Academy and VAULT OS, you acknowledge and agree that the platform provides educational, informational, analytical, journaling, tracking, and risk-management tools only. Nothing on the platform, including content, alerts, analytics, calculators, coaching, live sessions, community discussions, performance tracking, or any other feature, constitutes financial, investment, trading, legal, or tax advice, or a recommendation to buy, sell, hold, or enter any security, option, or financial instrument.
                      <br /><br />
                      You understand that trading and investing involve substantial risk and may result in partial or total loss of capital. Past performance does not guarantee future results. Vault Trading Academy and VAULT OS do not guarantee profits, performance, success, or any specific outcome.
                      <br /><br />
                      You acknowledge that you are solely responsible for your decisions, orders, entries, exits, position sizing, risk management, broker selections, account activity, and all results arising from your trading or investing activity. You agree that any action you take based on information, tools, or features provided through the platform is taken at your own risk.
                      <br /><br />
                      You understand and agree that Vault Trading Academy may collect, use, store, and process your personal information in accordance with its Privacy Policy and may use service providers and infrastructure providers to operate the platform, process payments, maintain accounts, support analytics, and secure the Services.
                      <br /><br />
                      If account connectivity features are offered, you understand that Vault Trading Academy may allow you to connect financial accounts through third-party providers such as Plaid. If you choose to use such features, you authorize the processing of the financial data made available through those integrations for purposes such as analytics, account tracking, performance insights, and related platform functionality. Vault Trading Academy does not collect or store your bank login credentials.
                      <br /><br />
                      You understand that third-party services, brokerages, banks, payment processors, and integrations may experience outages, delays, interruptions, inaccuracies, security events, or other failures, and Vault Trading Academy is not responsible for the acts, omissions, errors, data issues, service interruptions, or decisions of any third party.
                      <br /><br />
                      To the fullest extent permitted by law, you agree that Vault Trading Academy, VAULT OS, and their owners, affiliates, officers, employees, contractors, educators, coaches, agents, and service providers shall not be liable for any direct, indirect, incidental, consequential, special, exemplary, trading, business, financial, data, or other losses or damages arising from or related to your use of the platform, your inability to use the platform, your reliance on any content or feature, or your trading or investment activity.
                      <br /><br />
                      You further acknowledge that your use of the platform is subject to the Terms of Service and Privacy Policy, including provisions regarding account use, payments, subscriptions, cancellations, refunds, data practices, and platform rules. If you do not agree, do not create an account or use the platform.
                    </p>
                  </div>
                </ScrollArea>

                {/* Footer with Checkbox + Confirm */}
                <div className="px-6 py-5 border-t border-white/[0.06] bg-white/[0.02] backdrop-blur-sm space-y-4">
                  <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/[0.08] p-3.5">
                    <Checkbox
                      id="agreement-modal"
                      checked={agreementDraftChecked}
                      onCheckedChange={(v) => setAgreementDraftChecked(v === true)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:shadow-[0_0_10px_rgba(59,130,246,0.4)] transition-all duration-150"
                    />
                    <label htmlFor="agreement-modal" className="text-[11.5px] leading-[1.6] text-foreground/70 cursor-pointer select-none">
                      I have read and agree to the{" "}
                      <a href="https://vaulttradingacademy.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Terms of Service</a>
                      {" "}and{" "}
                      <a href="https://vaulttradingacademy.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Privacy Policy</a>
                      , understand that VAULT OS is for educational and analytical purposes only, acknowledge the risks of trading and investing, consent to the processing of my information as described, and accept full responsibility for my decisions, account activity, and results.
                    </label>
                  </div>
                  <Button
                    type="button"
                    className={`w-full h-11 text-sm font-semibold rounded-xl transition-all duration-200 ${agreementDraftChecked ? "shadow-[0_0_20px_rgba(59,130,246,0.2)]" : ""}`}
                    disabled={!agreementDraftChecked}
                    onClick={() => { setAgreementChecked(true); setAgreementModalOpen(false); }}
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Accept & Continue
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Divider */}
            <div className="border-t border-border/10 pt-3.5">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-xl gap-2"
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
