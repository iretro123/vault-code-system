import { Lock, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AccessStatus } from "@/hooks/useStudentAccess";

interface Props {
  status: AccessStatus;
  pageName?: string;
}

export function PremiumGate({ status, pageName }: Props) {
  const [loading, setLoading] = useState(false);

  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      const url = data?.url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (err: unknown) {
      console.error("[AccessGate] Checkout error:", err);
      toast.error("Unable to start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[50vh] px-4">
      <Card className="max-w-md w-full p-8 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          {isPastDue || isCanceled ? (
            <CreditCard className="h-7 w-7 text-primary" />
          ) : (
            <Lock className="h-7 w-7 text-primary" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">
            {isPastDue
              ? "Payment Issue"
              : isCanceled
              ? "Subscription Canceled"
              : `Unlock ${pageName || "Premium Content"}`}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isPastDue
              ? "Your payment is past due. Please update your billing to continue accessing premium content."
              : isCanceled
              ? "Your subscription has been canceled. Rejoin to regain access."
              : "This content is available to Vault Academy members. Join to unlock full access."}
          </p>
        </div>

        <Button onClick={handleUpgrade} disabled={loading} className="w-full gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPastDue ? "Update Billing" : isCanceled ? "Rejoin Vault Academy" : "Join Vault Academy"}
        </Button>
      </Card>
    </div>
  );
}
