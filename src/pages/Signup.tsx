import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
      const { data: sessionData } = await supabase.auth.getSession();
      const newUserId = sessionData?.session?.user?.id;

      // If no session (email confirmation required), show message and stop
      if (!newUserId) {
        toast({ title: "Check your email", description: "Please confirm your email address to complete signup." });
        setLoading(false);
        return;
      }

      toast({ title: "Account created", description: "Welcome to Vault Academy." });

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

      // Referral attribution
      const savedRef = getStoredReferral();
      if (savedRef) {
        try {
          const { data: updated } = await supabase
            .from("referrals" as any)
            .update({ referred_user_id: newUserId, referred_email: email, status: "signed_up" } as any)
            .eq("referrer_user_id", savedRef)
            .eq("status", "clicked")
            .is("referred_user_id", null)
            .select("id")
            .limit(1);

          if (!updated || (updated as any[]).length === 0) {
            await supabase.from("referrals" as any).insert({
              referrer_user_id: savedRef,
              referred_user_id: newUserId,
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

      localStorage.removeItem("va_cache_student_access");
      navigate("/academy/profile");
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
      className="h-[100dvh] overflow-y-auto px-4 pt-12 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pt-16 sm:pb-16 flex items-start justify-center"
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
                    <p className="text-[13px] font-semibold text-foreground">Performance Guarantee</p>
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
              <DialogContent className="max-w-[92vw] sm:max-w-lg w-full !max-h-[85dvh] p-0 gap-0 border-white/[0.08] bg-[hsl(220,20%,8%)] shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_60px_rgba(59,130,246,0.08),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl overflow-hidden backdrop-blur-xl !flex !flex-col">
                <DialogTitle className="sr-only">VAULT OS Conditional Performance Guarantee</DialogTitle>
                {/* Modal Header */}
                <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent shrink-0">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-primary/15 shadow-[0_0_20px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                      <ShieldCheck className="h-5.5 w-5.5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-foreground tracking-tight">VAULT OS Conditional Performance Guarantee</h2>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">Please read all terms carefully before proceeding</p>
                    </div>
                  </div>
                </div>

                {/* Scrollable Legal Text — native scroll for mobile touch reliability */}
                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
                  style={{ touchAction: "pan-y" }}
                >
                  <div className="px-4 sm:px-6 py-4 bg-black/20">
                    <div className="text-[11.5px] leading-[1.75] text-muted-foreground/90 space-y-4">
                      <p className="text-[13px] font-bold text-foreground tracking-tight uppercase">VAULT OS CONDITIONAL PERFORMANCE GUARANTEE</p>

                      <div>
                        <p className="font-semibold text-foreground mb-1">1. Overview</p>
                        <p>Vault Trading Academy LLC ("Company") offers a conditional performance-based guarantee (the "Guarantee") to eligible users of VAULT OS.</p>
                        <p>This Guarantee is not unconditional and applies only under strict compliance with all VAULT OS rules and requirements.</p>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">2. Guarantee Statement</p>
                        <p>If a user fully complies with all VAULT OS risk management rules and system requirements, and still experiences a complete loss of their trading account ("Account Loss"), the Company may issue a refund of the Program fees paid, subject to verification and approval.</p>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">3. Definition of Account Loss</p>
                        <p>"Account Loss" means a substantial depletion of the trading account balance as determined by the Company based on submitted records and system data.</p>
                        <p>The Company retains sole discretion in determining whether an Account Loss qualifies under this definition.</p>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">4. Eligibility Requirements (All Must Be Met)</p>
                        <p>To qualify for the Guarantee, the user must:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Use VAULT OS as their primary and exclusive trading structure</li>
                          <li>Follow all VAULT OS risk rules, including but not limited to:
                            <ul className="list-disc pl-5 mt-1 space-y-0.5">
                              <li>position sizing limits</li>
                              <li>daily loss limits</li>
                              <li>trade frequency limits</li>
                            </ul>
                          </li>
                          <li>Immediately stop trading when system limits are reached</li>
                          <li>Accurately log all trades within VAULT OS</li>
                          <li>Maintain a minimum compliance level as determined by the Company</li>
                          <li>Provide complete and verifiable records upon request, including broker statements</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">5. Disqualification (Guarantee Void)</p>
                        <p>The Guarantee is automatically void if any of the following occur:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Failure to follow VAULT OS rules at any time</li>
                          <li>Trading outside the VAULT OS system or executing unlogged trades</li>
                          <li>Ignoring or overriding risk limits or stop conditions</li>
                          <li>Incomplete, inaccurate, or falsified data</li>
                          <li>Use of multiple or undisclosed accounts</li>
                          <li>Any attempt to manipulate, exploit, or abuse the Guarantee</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">6. Scope of Refund</p>
                        <p>Applies only to fees paid directly to Vault Trading Academy LLC</p>
                        <p className="mt-1">Does not include:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>trading losses</li>
                          <li>brokerage or platform losses</li>
                          <li>third-party fees or expenses</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">7. Verification & Review</p>
                        <p>All claims are subject to:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Full review and verification by the Company</li>
                          <li>Evaluation of system data, trade logs, and supporting documentation</li>
                        </ul>
                        <p className="mt-1">The Company reserves sole and final discretion in determining eligibility and approval of any refund request.</p>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">8. Time Limit for Claims</p>
                        <p>All claims must be submitted within [X days] of the alleged Account Loss, along with all required documentation.</p>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">9. No Guarantee of Results</p>
                        <p>The Company does not guarantee trading profits, success, or financial outcomes.</p>
                        <p>This Guarantee exists solely to reinforce proper use of the VAULT OS system.</p>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">10. Anti-Fraud Policy</p>
                        <p>Any suspected fraud, misrepresentation, or abuse will result in:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Immediate disqualification</li>
                          <li>Termination of access</li>
                          <li>Denial of current and future claims</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">11. Limitation of Liability</p>
                        <p>To the maximum extent permitted by law:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>The Company's liability is limited strictly to the amount paid for the Program</li>
                          <li>The Company is not liable for any trading or financial losses</li>
                        </ul>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground mb-1">12. Acceptance of Terms</p>
                        <p>By purchasing or using VAULT OS, the user acknowledges and agrees to these terms in full.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with Checkbox + Confirm */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-white/[0.06] bg-white/[0.02] backdrop-blur-sm space-y-3 sm:space-y-4 shrink-0">
                  <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
                    <Checkbox
                      id="agreement-modal"
                      checked={agreementDraftChecked}
                      onCheckedChange={(v) => setAgreementDraftChecked(v === true)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:shadow-[0_0_10px_rgba(59,130,246,0.4)] transition-all duration-150"
                    />
                    <label htmlFor="agreement-modal" className="text-[11.5px] leading-[1.55] text-foreground/70 cursor-pointer select-none">
                      I have read and agree to the VAULT OS Conditional Performance Guarantee, including all eligibility requirements, disqualification conditions, and limitations of liability. I understand this is not a guarantee of trading profits or success.
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
