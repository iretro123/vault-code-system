import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivityLog } from "@/hooks/useActivityLog";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  trialing: { label: "Trial", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  past_due: { label: "Past Due", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  canceled: { label: "Canceled", className: "bg-red-500/15 text-red-400 border-red-500/20" },
  none: { label: "No Plan", className: "bg-muted text-muted-foreground border-border" },
};

function openUrl(url: string) {
  const win = window.open(url, "_blank");
  if (!win) {
    toast({ title: "Redirecting…", description: "Opening in this tab." });
    window.location.href = url;
  }
}

export function SettingsBilling() {
  const { status, tier, hasAccess, loading, isAdminBypass } = useStudentAccess();
  const [busy, setBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { logActivity } = useActivityLog();

  // Handle ?billing=returned
  useEffect(() => {
    if (searchParams.get("billing") === "returned") {
      toast({ title: "Welcome back", description: "Billing changes may take a moment to reflect." });
      searchParams.delete("billing");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const handleManageBilling = async () => {
    setBusy(true);
    try {
      console.log("[BillingPortal] Opening portal…");
      logActivity("billing_portal_opened", "settings");
      const { data, error } = await supabase.functions.invoke("create-billing-portal");
      if (error) throw error;
      if (data?.error === "no_stripe_customer") {
        toast({ title: "No billing account found", description: "Subscribe first to manage billing.", variant: "destructive" });
        return;
      }
      if (data?.error) throw new Error(data.error);
      if (data?.url) openUrl(data.url);
    } catch (err: unknown) {
      console.error("[BillingPortal] Error:", err);
      toast({
        title: "Could not open billing portal",
        description: err instanceof Error ? err.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    setBusy(true);
    try {
      console.log("[CheckoutReturn] Starting checkout…");
      logActivity("checkout_started", "settings");
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) openUrl(data.url);
    } catch (err: unknown) {
      console.error("[CheckoutReturn] Error:", err);
      toast({
        title: "Could not start checkout",
        description: err instanceof Error ? err.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.none;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Status row */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className={cn("text-xs font-medium", cfg.className)}>
              {cfg.label}
            </Badge>
          </div>

          {/* Tier */}
          {tier && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium text-foreground capitalize">
                {tier.replace(/_/g, " ")}
              </span>
            </div>
          )}

          {/* Admin bypass indicator */}
          {isAdminBypass && (
            <p className="text-xs text-muted-foreground/70 italic">
              Access granted via admin/operator role.
            </p>
          )}

          {/* Action buttons */}
          <div className="pt-2">
            {status !== "none" ? (
              <Button
                onClick={handleManageBilling}
                disabled={busy || loading}
                variant="outline"
                className="w-full gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Manage Billing
              </Button>
            ) : (
              <Button
                onClick={handleJoin}
                disabled={busy || loading}
                className="w-full"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Join Vault Academy
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground/60 text-center pt-1">
            Billing changes are managed securely via Stripe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
