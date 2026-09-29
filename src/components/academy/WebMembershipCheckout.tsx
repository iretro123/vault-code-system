import { useRef, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VAULT_OS_MONTHLY_FALLBACK_PRICE, VAULT_OS_PRIVACY_POLICY_URL, VAULT_OS_TERMS_URL } from "@/lib/membership";
import { AuthBackButton } from "@/components/auth/AuthBackButton";
import "@/pages/welcome.css";
import "@/pages/create-account.css";

export function WebMembershipCheckout({ email, preview = false }: { email: string; preview?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  async function checkout() {
    if (preview || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const {data:auth, error:authError} = await supabase.auth.getUser();
      if (authError || !auth.user || auth.user.email?.toLowerCase() !== email.toLowerCase()) throw new Error("Please log in again before starting checkout.");
      const {data, error:checkoutError} = await supabase.functions.invoke("create-checkout");
      if (checkoutError || data?.error) throw new Error("Checkout could not be started. Please try again or contact support.");
      const url = new URL(data?.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com" || url.username || url.password) throw new Error("An invalid checkout link was returned. Please contact support.");
      window.location.assign(url.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open checkout. Please try again.");
      inFlight.current = false; setBusy(false);
    }
  }
  return <main className="vault-entry academy-main-safe"><div className="vault-entry-shell">
    <header className="vault-entry-header"><AuthBackButton fallback="/welcome?step=access"/><span className="vault-entry-brand">VAULT <b>OS</b></span></header>
    <section className="vault-signup-content">
      {preview && <p role="status" style={{color:"#a7b6cc",fontSize:12,marginBottom:16}}>Local preview · Example email · Payments disabled</p>}
      <div className="vault-signup-plan"><ShieldCheck size={16}/>PAYMENT · STEP 2 OF 3</div>
      <div className="vault-entry-title"><h1>Make it<br/>Full Access.</h1><p>Live sessions, full training, trading tools, and community.</p></div>
      <div className="vault-plan vault-plan--full" style={{marginTop:24}}>
        <h2>Vault OS Full Access</h2><p style={{fontSize:28,marginTop:8}}>{VAULT_OS_MONTHLY_FALLBACK_PRICE}</p>
        <p style={{fontSize:13,color:"#a7b6cc",marginTop:16}}>Your membership will belong to:</p><strong style={{display:"block",overflowWrap:"anywhere",marginTop:6}}>{email}</strong>
        <p style={{fontSize:12,color:"#a7b6cc",marginTop:14,lineHeight:1.6}}>Renews monthly until canceled. Review the final amount and payment details in Stripe before confirming.</p>
      </div>
      <div style={{marginTop:24}}>
        {error && <p role="alert" style={{color:"#ffacb5",fontSize:14,marginBottom:16}}>{error}</p>}
        <button className="vault-entry-button" disabled={busy || preview} onClick={checkout}>{busy ? <><Loader2 size={18} className="animate-spin"/>Opening Stripe...</> : <>Continue to Stripe<ArrowRight size={18}/></>}</button>
        <p style={{textAlign:"center",fontSize:12,color:"#a7b6cc",marginTop:12}}>You confirm payment on Stripe, not on this screen.</p>
      </div>
    </section>
    <footer className="vault-entry-footer"><a href={VAULT_OS_TERMS_URL} target="_blank" rel="noopener noreferrer">Terms</a><a href={VAULT_OS_PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">Privacy</a></footer>
  </div></main>;
}
