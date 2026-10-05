import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { VAULT_OS_MONTHLY_FALLBACK_PRICE, VAULT_OS_PRIVACY_POLICY_URL, VAULT_OS_TERMS_URL } from "@/lib/membership";
import { isNativeAndroidApp, isNativeIOSApp } from "@/lib/platform";
import { AuthBackButton } from "@/components/auth/AuthBackButton";
import { disableGuestMode } from "@/lib/guestMode";
import { authErrorMessage } from "@/lib/authErrorMessage";
import { PaidRecoveryLink } from "@/components/auth/PaidRecoveryLink";
import "./welcome.css";
import "./create-account.css";

export const RESEND_COOLDOWN_SECONDS = 60;

export default function CreateAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState<{ ok: boolean; text: string } | null>(null);
  const submitting = useRef(false);
  const isFullAccessFlow = location.pathname.endsWith("/full");
  const provider = isNativeIOSApp() ? "Apple" : isNativeAndroidApp() ? "Google Play" : "Stripe";
  const destinationPath = isFullAccessFlow ? "/membership" : "/academy/community?tab=trade-floor";

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  // Signed-in members never create a second account. Full-access goes through
  // /membership, which sends already-entitled members straight to the academy
  // using the server access check, so nobody is asked to pay twice.
  if (!authLoading && user && !verificationEmail) {
    return <Navigate to={isFullAccessFlow ? "/membership" : "/"} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || submitting.current || verificationEmail) return;
    if (!accepted || password.length < 8) return;
    submitting.current = true;
    setLoading(true);
    const accountEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signUp({
        email: accountEmail, password,
        options: { emailRedirectTo: `${window.location.origin}${destinationPath}` },
      });
      if (error) throw error;
      if (data.user?.id && data.session) {
        // Preserve the existing basic-role bootstrap; membership is granted separately.
        const { error: roleError } = await supabase.from("user_roles").insert({user_id:data.user.id, role:"basic_tier"});
        if (roleError && roleError.code !== "23505") {
          toast({title:"Account created", description:"Your access is still being prepared. If it does not appear, contact support."});
        }
      }
      disableGuestMode();
      window.dispatchEvent(new Event("guest-mode-changed"));
      setPassword("");
      setShowPassword(false);
      if (data.session) navigate(destinationPath, {replace:true});
      else { setVerificationEmail(accountEmail); setCooldown(RESEND_COOLDOWN_SECONDS); setResendNote(null); }
    } catch (error: unknown) {
      toast({title:"Could not create account", description:authErrorMessage(error), variant:"destructive"});
    } finally { setLoading(false); submitting.current = false; }
  }

  async function resend() {
    if (resending || cooldown > 0 || !verificationEmail) return;
    setResending(true); setResendNote(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: verificationEmail, options: { emailRedirectTo: `${window.location.origin}${destinationPath}` } });
      if (error) throw error;
      setResendNote({ ok: true, text: "If this email needs confirming, a new link is on its way." });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error: unknown) {
      const msg = authErrorMessage(error);
      setResendNote({ ok: false, text: /rate|seconds|too many/i.test(msg) ? "Please wait a minute before asking for another link." : msg });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally { setResending(false); }
  }

  function changeEmail() {
    setEmail(verificationEmail);
    setVerificationEmail("");
    setResendNote(null);
    setCooldown(0);
  }

  return <main className="vault-entry academy-main-safe">
    <div className="vault-entry-shell vault-signup-shell">
      <header className="vault-entry-header"><AuthBackButton fallback="/welcome?step=access"/><span className="vault-entry-brand">VAULT <b>OS</b></span><Link to="/auth">Log in</Link></header>
      <section className="vault-signup-content">
        {verificationEmail ? <div className="vault-signup-verify" role="status">
          <Mail size={32}/><h1>Check your inbox.</h1><p>Open the confirmation link sent to</p><strong>{verificationEmail}</strong>
          <p>{isFullAccessFlow ? "Confirm your email, then continue to membership payment. No purchase has been made yet." : "Confirm your email to finish creating your free account."}</p>
          <p>Check spam if the message has not arrived. If this email already has a Vault account, log in or reset your password instead.</p>
          <button type="button" className="vault-entry-button vault-entry-button--secondary" onClick={resend} disabled={resending || cooldown > 0} aria-busy={resending}>
            {resending ? <><Loader2 size={18} className="animate-spin"/>Sending…</> : cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend confirmation email"}
          </button>
          {resendNote && <p role={resendNote.ok ? "status" : "alert"}>{resendNote.text}</p>}
          <button type="button" className="vault-entry-button vault-entry-button--secondary" onClick={changeEmail}>Change email</button>
          <Link className="vault-entry-button" to="/auth">Go to login<ArrowRight size={18}/></Link>
        </div> : <>
          <div className="vault-signup-plan"><ShieldCheck size={16}/>{isFullAccessFlow ? `Full Access · ${VAULT_OS_MONTHLY_FALLBACK_PRICE}` : "Free Community"}</div>
          <div className="vault-entry-title"><h1>Create your<br/>Vault account.</h1><p>{isFullAccessFlow ? "Your login first. Payment comes next." : "Community chat and a free course. Start here."}</p></div>
          {isFullAccessFlow && <ol className="vault-signup-steps" aria-label="Membership setup"><li aria-current="step"><b>1</b>Account</li><li><b>2</b>Payment</li><li><b>3</b>Your Vault</li></ol>}
          <form onSubmit={handleSubmit} className="vault-signup-form" aria-busy={loading}>
            <div><label htmlFor="signup-email">Email</label><input id="signup-email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={e=>setEmail(e.target.value)} required disabled={loading} placeholder="you@example.com" aria-describedby="signup-email-help"/><p id="signup-email-help">Use this email whenever you log in.</p></div>
            <div><label htmlFor="signup-password">Password</label><div className="vault-signup-password"><input id="signup-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required disabled={loading} placeholder="At least 8 characters" aria-describedby="signup-password-help"/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div><p id="signup-password-help">Save your login in your device's password manager.</p></div>
            <label className="vault-signup-consent"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required disabled={loading}/><span>I agree to the <a href={VAULT_OS_TERMS_URL} target="_blank" rel="noopener noreferrer">Terms of Use</a> and acknowledge the <a href={VAULT_OS_PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</span></label>
            <button type="submit" className="vault-entry-button" disabled={loading || !accepted}>{loading ? <><Loader2 size={18} className="animate-spin"/>Creating account...</> : <>{isFullAccessFlow ? "Create account & continue" : "Create free account"}<ArrowRight size={18}/></>}</button>
            {isFullAccessFlow && <p className="vault-signup-payment-note">No charge on this step. Review and confirm your subscription through {provider} next.</p>}
          </form>
          <div className="vault-entry-crosslinks">
            <p>Already registered? <Link to="/auth">Log in instead</Link></p>
            <PaidRecoveryLink />
          </div>
        </>}
      </section>
    </div>
  </main>;
}
