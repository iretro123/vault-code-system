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

interface Props {
  status: AccessStatus;
  refetch: () => void;
}

export function AccessBlockModal({ status, refetch }: Props) {
  const [loading, setLoading] = useState(false);
  const isPastDue = status === "past_due";

  // Auto-refresh when user returns from Stripe portal/checkout
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refetch]);

  const handleReactivate = async () => {
    setLoading(true);
    try {
      // Try billing portal first (works for existing Stripe customers)
      const { data, error } = await supabase.functions.invoke("create-billing-portal");

      if (!error && data?.url) {
        window.open(data.url, "_blank") || (window.location.href = data.url);
        setLoading(false);
        return;
      }

      // Fallback: if no Stripe customer, go to checkout
      if (error || data?.error === "no_stripe_customer") {
        const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("create-checkout");
        if (checkoutErr) throw checkoutErr;
        if (!checkoutData?.url) throw new Error("No checkout URL");
        window.location.href = checkoutData.url;
        return;
      }

      throw new Error(data?.error || "Unknown error");
    } catch (err: any) {
      console.error("[AccessBlock] Error:", err);
      toast.error("Unable to open billing. Please try again.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
            {isPastDue ? "Payment Failed" : "Subscription Canceled"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {isPastDue
              ? "Your most recent payment didn't go through. Update your billing information to restore full access to Vault Academy."
              : "Your Vault Academy subscription has been canceled. Reactivate your account to regain access to all premium content and features."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleReactivate}
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPastDue ? "Update Billing" : "Reactivate Account"}
          </Button>
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
