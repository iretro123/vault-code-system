import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { hasFullAccess } from "@/lib/entitlements";
import "./welcome.css";
import "./create-account.css";

export default function MembershipConfirmation() {
  const { user, loading, userRole, refetchProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const refreshRef = useRef(refetchProfile);
  refreshRef.current = refetchProfile;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"checking" | "ready" | "delayed">("checking");

  useEffect(() => {
    if (loading || !user?.id) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    // Bound the wait even when a request stalls. Never grant access from URL params.
    const deadline = setTimeout(() => {
      stopped = true;
      clearTimeout(timer);
      setState("delayed");
    }, 60_000);
    setState("checking");
    async function check() {
      try {
        const access = await supabase.rpc("get_my_access_state");
        if (stopped) return;
        const roles = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
        if (stopped) return;
        const row = Array.isArray(access.data) ? access.data[0] : access.data;
        if (!access.error && !roles.error && row?.has_access === true &&
            (row.status === "active" || row.status === "trialing") &&
            roles.data?.some(role => hasFullAccess(role.role))) {
          await refreshRef.current();
          // Invalidate mounted and inactive channel/access caches before entering.
          await queryClient.invalidateQueries();
          if (stopped) return;
          clearTimeout(deadline);
          setState("ready");
          return;
        }
      } catch {
        // A transient network failure should not send a paid user to buy again.
      }
      if (!stopped) timer = setTimeout(check, 3000);
    }
    void check();
    return () => { stopped = true; clearTimeout(timer); clearTimeout(deadline); };
  }, [loading, user?.id, attempt, queryClient]);

  const ready = state === "ready" && hasFullAccess(userRole?.role);
  return <main className="vault-entry academy-main-safe"><div className="vault-entry-shell">
    <header className="vault-entry-header"><span className="vault-entry-brand">VAULT <b>OS</b></span></header>
    <section className="vault-signup-content" aria-live="polite">
      <div className="vault-signup-plan">YOUR VAULT · STEP 3 OF 3</div>
      <div className="vault-entry-title">
        {ready ? <CheckCircle2 size={40} color="#77aaff"/> : state === "checking" ? <Loader2 size={36} className="animate-spin"/> : null}
        <h1>{ready ? "Full Access activated." : !user && !loading ? "Resume your setup." : state === "checking" ? "Confirming your membership." : "Still confirming access."}</h1>
        <p>{ready ? "Your member channels, training, live rooms, and trading tools are ready." : !user && !loading ? "Sign in with the account you used before checkout. You do not need to purchase again." : state === "checking" ? "We are checking your membership securely. You do not need to pay again." : "We couldn't confirm access yet. Check again without making another payment."}</p>
        {user?.email && <p className="text-sm break-all">Checking account: {user.email}</p>}
      </div>
      <div style={{marginTop:28}}>
        {!user && !loading ? <Link className="vault-entry-button" to="/auth?resume=membership">Log in to continue</Link> : ready ?
          <button className="vault-entry-button" onClick={() => navigate("/academy/home", {replace:true})}>Continue to your Vault</button> :
          (state === "delayed" || state === "ready") && <><button className="vault-entry-button" onClick={() => setAttempt(value => value + 1)}>Check access again</button><p style={{color:"#a7b6cc",marginTop:16}}>If this continues, contact Vault support with your checkout email and receipt. Some payment methods take longer to confirm.</p></>}
      </div>
    </section>
  </div></main>;
}
