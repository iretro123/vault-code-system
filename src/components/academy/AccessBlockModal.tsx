import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertTriangle, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AccessStatus } from "@/hooks/useStudentAccess";
import { isNativeIOSApp, isNativeAndroidApp } from "@/lib/platform";

interface Props {
  status: AccessStatus;
  refetch: () => Promise<void>;
}

export function AccessBlockModal({ status, refetch }: Props) {
  const [loading, setLoading] = useState(false);
  const isPastDue = status === "past_due";
  const isNative = isNativeIOSApp() || isNativeAndroidApp();

  // Auto-refresh when user returns from Stripe portal/checkout
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        void refetch().catch(() => toast.error("Couldn't check access. Please try again."));
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refetch]);

  const handleReactivate = async () => {
    if (isNative) {
      toast.info("Billing changes are not available here in the mobile app. If your access was updated elsewhere, tap Refresh Access.");
      return;
    }

    setLoading(true);
    try {
      // Try billing portal first (works for existing Stripe customers)
      const { data, error } = await supabase.functions.invoke("create-billing-portal");
      if (error) throw error;

      if (!error && data?.url) {
        const opened = window.open(data.url, "_blank");
        if (!opened) window.location.href = data.url;
        setLoading(false);
        return;
      }

      // Fallback: if no Stripe customer, go to checkout
      if (data?.error === "no_stripe_customer") {
        const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("create-checkout");
        if (checkoutErr) throw checkoutErr;
        if (!checkoutData?.url) throw new Error("No checkout URL");
        window.location.href = checkoutData.url;
        return;
      }

      throw new Error(data?.error || "Unknown error");
    } catch (err: unknown) {
      console.error("[AccessBlock] Error:", err);
      toast.error("Unable to open billing. Please try again.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleRefreshAccess = async () => {
    setLoading(true);
    try {
      await refetch();
    } catch {
      toast.error("Couldn't check access. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open>
      <AlertDialogContent className="max-w-md border-border/50 bg-card">
        <AlertDialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            {isPastDue ? (
              <CreditCard className="h-7 w-7 text-destructive" />
            ) : (
              <AlertTriangle className="h-7 w-7 text-destructive" />
            )}
          </div>
          <AlertDialogTitle className="text-xl">
            {isNative ? "Check your access" : isPastDue ? "Payment needs attention" : status === "canceled" ? "Subscription canceled" : "Let's check your membership"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {isNative
              ? "Billing changes are not available here in the mobile app. If your account access changed elsewhere, refresh your access below."
              : isPastDue
              ? "Your most recent payment didn't go through. Update your billing information to restore full access to Vault Academy."
              : status === "canceled" ? "Your subscription is marked canceled. If you recently renewed, check access again before changing your billing."
              : "We haven't confirmed full access yet. If you just paid, check again using the same account. You do not need to purchase again."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {!isNative && <Button onClick={handleRefreshAccess} disabled={loading} className="w-full gap-2" size="lg">{loading && <Loader2 className="h-4 w-4 animate-spin"/>}{loading ? "Checking access..." : "Check access again"}</Button>}
          {isNative ? (
            <Button
              onClick={handleRefreshAccess}
              disabled={loading}
              className="w-full gap-2"
              size="lg"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Checking access..." : "Check access again"}
            </Button>
          ) : (isPastDue || status === "canceled") ? (
            <Button
              onClick={handleReactivate}
              variant="outline"
              disabled={loading}
              className="w-full gap-2"
              size="lg"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPastDue ? "Update Billing" : "Reactivate Account"}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
