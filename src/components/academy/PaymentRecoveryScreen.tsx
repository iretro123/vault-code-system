import { useState } from "react";
import { CreditCard, Loader2, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isNativeAndroidApp, isNativeIOSApp } from "@/lib/platform";

const SUPPORT_EMAIL = "vault@vaulttradingacademy.com";

interface Props {
  onCheckStatus: () => Promise<unknown>;
}

/**
 * Full-page, non-dismissible past-due recovery. Opens ONLY the signed-in
 * member's own Stripe billing portal; never starts a new checkout.
 */
export function PaymentRecoveryScreen({ onCheckStatus }: Props) {
  const [busy, setBusy] = useState<"portal" | "check" | null>(null);
  const isNative = isNativeIOSApp() || isNativeAndroidApp();

  const openPortal = async () => {
    setBusy("portal");
    try {
      const { data, error } = await supabase.functions.invoke("create-billing-portal");
      if (error || !data?.url) throw error ?? new Error("no_url");
      const opened = window.open(data.url, "_blank");
      if (!opened) window.location.href = data.url;
    } catch {
      toast.error(`We couldn't open your billing details. Please try again or email ${SUPPORT_EMAIL}.`);
    } finally {
      setBusy(null);
    }
  };

  const checkStatus = async () => {
    setBusy("check");
    try { await onCheckStatus(); } catch { toast.error("Couldn't check payment status. Please try again."); }
    finally { setBusy(null); }
  };

  return (
    <main role="main" aria-labelledby="payment-recovery-title" className="academy-top-safe min-h-[100dvh] w-full flex items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <CreditCard className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Vault Academy</p>
        <h1 id="payment-recovery-title" className="mt-2 text-2xl font-semibold text-foreground">Check your payment details</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your membership payment is past due. Update your payment details and complete the outstanding payment to restore access.
        </p>
        {isNative && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Billing changes aren't available in the mobile app. Sign in at member.vaulttradingacademy.com on the web, or use the link in your payment email, then come back and check your payment status.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          {!isNative && (
            <Button size="lg" className="w-full gap-2" onClick={openPortal} disabled={busy !== null}>
              {busy === "portal" && <Loader2 className="h-4 w-4 animate-spin" />}
              Update payment details
            </Button>
          )}
          <Button size="lg" variant="outline" className="w-full gap-2" onClick={checkStatus} disabled={busy !== null}>
            {busy === "check" && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy === "check" ? "Checking payment status..." : "Check payment status"}
          </Button>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Mail className="h-4 w-4" aria-hidden="true" /> Contact support
          </a>
          <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={() => void supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}
