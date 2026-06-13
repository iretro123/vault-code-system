import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isNativeIOSApp } from "@/lib/platform";
import {
  FULL_ACCESS_ROLE,
  VAULT_OS_MONTHLY_FALLBACK_PRICE,
  VAULT_OS_MONTHLY_PRODUCT_ID,
  isSharedGuestAccount,
} from "@/lib/membership";
import { StoreKitMembership, type MembershipProduct, type MembershipTransaction } from "@/lib/nativeMembership";

const MembershipUpgrade = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, userRole, loading, refetchProfile, signOut } = useAuth();
  const [product, setProduct] = useState<MembershipProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const isIOS = isNativeIOSApp();
  const sharedGuest = isSharedGuestAccount(user, profile);
  const hasFullAccess = !!userRole && userRole.role !== "basic_tier";

  const displayPrice = useMemo(() => {
    return product?.displayPrice || VAULT_OS_MONTHLY_FALLBACK_PRICE;
  }, [product]);

  useEffect(() => {
    if (!user || !isIOS || sharedGuest || hasFullAccess) return;

    let cancelled = false;
    setLoadingProduct(true);

    StoreKitMembership.getProducts({ productIds: [VAULT_OS_MONTHLY_PRODUCT_ID] })
      .then(({ products }) => {
        if (cancelled) return;
        console.info("[MembershipUpgrade] Loaded StoreKit products", products);
        setProduct(products[0] ?? null);
        if (!products[0]) {
          toast({
            title: "Membership unavailable right now",
            description: "The App Store product is not ready on this device yet.",
            variant: "destructive",
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[MembershipUpgrade] Failed to load products", error);
        toast({
          title: "Could not load membership details",
          description: "The App Store product is not ready on this device yet.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingProduct(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, isIOS, sharedGuest, hasFullAccess]);

  async function activateMembership(transaction: MembershipTransaction) {
    console.info("[MembershipUpgrade] Activating membership with transaction", transaction);
    const { error } = await supabase.functions.invoke("activate-ios-membership", {
      body: {
        productId: transaction.productId,
        transactionId: transaction.transactionId,
        originalTransactionId: transaction.originalTransactionId,
        purchaseDate: transaction.purchaseDate,
        expirationDate: transaction.expirationDate ?? null,
        environment: transaction.environment ?? null,
        ownershipType: transaction.ownershipType ?? null,
        appAccountToken: transaction.appAccountToken ?? null,
      },
    });

    if (error) throw error;

    await refetchProfile();
  }

  async function handlePurchase() {
    if (!user) return;

    if (!isIOS) {
      toast({
        title: "Purchase unavailable here",
        description: "Vault OS purchases are available in the iPhone app.",
        variant: "destructive",
      });
      return;
    }

    if (sharedGuest) {
      navigate("/create-account/full?source=guest", { replace: true });
      return;
    }

    setPurchasing(true);
    try {
      const { transaction } = await StoreKitMembership.purchase({
        productId: VAULT_OS_MONTHLY_PRODUCT_ID,
        appAccountToken: user.id,
      });
      console.info("[MembershipUpgrade] StoreKit purchase result", transaction);

      await activateMembership(transaction);

      toast({
        title: "Full access unlocked",
        description: "Your Vault OS membership is now active.",
      });

      navigate("/academy/home", { replace: true });
    } catch (error: any) {
      const message = error?.message ?? "Please try again.";
      if (message === "USER_CANCELLED") {
        toast({
          title: "Purchase canceled",
          description: "You can upgrade again whenever you're ready.",
        });
      } else if (message === "PURCHASE_PENDING") {
        toast({
          title: "Purchase pending",
          description: "Apple is still confirming this subscription.",
        });
      } else {
        toast({
          title: "Upgrade failed",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (!user || !isIOS) return;
    setRestoring(true);
    try {
      const { transactions } = await StoreKitMembership.restorePurchases({
        productIds: [VAULT_OS_MONTHLY_PRODUCT_ID],
      });
      console.info("[MembershipUpgrade] Restore transactions", transactions);

      if (!transactions.length) {
        toast({
          title: "No active purchase found",
          description: "There is no active Vault OS subscription to restore on this Apple ID.",
        });
        return;
      }

      await activateMembership(transactions[0]);
      toast({
        title: "Purchase restored",
        description: "Your full Vault OS access is active again.",
      });
      navigate("/academy/home", { replace: true });
    } catch (error: any) {
      toast({
        title: "Restore failed",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  }

  async function handleCreateOwnAccount() {
    if (sharedGuest) {
      await signOut();
    }
    navigate("/create-account/full?source=guest", { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 40%, rgba(59,130,246,0.10) 0%, transparent 70%),
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.22) 0%, transparent 55%),
            linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
          `,
        }}
      >
        <div className="w-full max-w-md rounded-3xl border border-border/40 bg-card/80 p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-foreground">VAULT</span>
            <span className="text-primary">OS</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Create your full access account to start the {VAULT_OS_MONTHLY_FALLBACK_PRICE} membership.
          </p>
          <div className="mt-8 space-y-3">
            <Button className="w-full h-14 text-base font-semibold rounded-2xl gap-2" onClick={() => navigate("/create-account/full")}>
              Create full access account
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-2xl" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (hasFullAccess && userRole?.role === FULL_ACCESS_ROLE) {
    return <Navigate to="/academy/home" replace />;
  }

  return (
    <div
      className="min-h-screen px-4 py-8 text-foreground"
      style={{
        background: `
          radial-gradient(ellipse 80% 55% at 50% 10%, rgba(59,130,246,0.16) 0%, transparent 55%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col justify-center">
        <div className="rounded-[28px] border border-border/40 bg-card/85 p-7 shadow-[0_14px_50px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Full Access Membership
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight">
            Unlock Vault OS
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Upgrade to full access for {displayPrice} and unlock the complete Vault OS member experience in the iPhone app.
          </p>

          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/10 p-5">
            <p className="text-4xl font-black tracking-tight">{displayPrice}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Auto-renewing monthly subscription billed by Apple.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {[
              "Full Vault OS app access on your account",
              "Video lessons, tools, live areas, and member-only sections",
              "No web checkout needed inside the iPhone app",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/30 bg-background/40 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-sm text-foreground/90">{item}</p>
              </div>
            ))}
          </div>

          {sharedGuest ? (
            <div className="mt-7 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm text-foreground">
                Guest preview uses a shared account, so it cannot hold a paid membership. Create your own account first, then subscribe to full access.
              </p>
              <div className="mt-4 space-y-3">
                <Button className="w-full h-14 rounded-2xl text-base font-semibold" onClick={handleCreateOwnAccount}>
                  Create full access account
                </Button>
                <Button variant="outline" className="w-full h-12 rounded-2xl" onClick={async () => { await signOut(); navigate("/welcome", { replace: true }); }}>
                  Exit guest mode
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-7 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-foreground">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <p>
                    Full access attaches to this account after a successful Apple subscription so your app immediately leaves the basic tier.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
                  onClick={handlePurchase}
                  disabled={purchasing || restoring || loadingProduct}
                >
                  {purchasing || loadingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Start full access for {displayPrice}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-2xl"
                  onClick={handleRestore}
                  disabled={purchasing || restoring}
                >
                  {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Restore purchase
                </Button>
              </div>
            </>
          )}

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Already subscribed? Use Restore purchase. Need a different account?{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MembershipUpgrade;
