import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isNativeAndroidApp, isNativeIOSApp } from "@/lib/platform";
import { openExternalUrl } from "@/lib/externalLinks";
import {
  FULL_ACCESS_ROLE,
  VAULT_OS_MONTHLY_FALLBACK_PRICE,
  VAULT_OS_MONTHLY_PRODUCT_ID,
  getVaultOsPrivacyPolicyUrl,
  getVaultOsTermsUrl,
  clearMembershipUiState,
  isSharedGuestAccount,
} from "@/lib/membership";
import { StoreKitMembership, type MembershipProduct, type MembershipTransaction } from "@/lib/nativeMembership";
import { GooglePlayMembership, type GooglePlayMembershipTransaction } from "@/lib/googlePlayMembership";

async function getFunctionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Membership activation failed. Please try again.";
  const context = (error as { context?: unknown })?.context;

  if (context && typeof context === "object" && "text" in context) {
    const response = context as Response;
    try {
      const raw = await response.clone().text();
      const payload = raw ? JSON.parse(raw) : null;
      if (payload && typeof payload.error === "string") return payload.error;
      if (payload && typeof payload.message === "string") return payload.message;
      if (raw) return raw;
    } catch (decodeError) {
      console.warn("[MembershipUpgrade] Could not decode function error body", decodeError);
      // Supabase already gave us a generic error; keep the fallback below.
    }
  }

  return fallback;
}

const MembershipUpgrade = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, userRole, loading, refetchProfile, signOut } = useAuth();
  const [product, setProduct] = useState<MembershipProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const isIOS = isNativeIOSApp();
  const isAndroid = isNativeAndroidApp();
  const purchaseUnavailableOnThisPlatform = !isIOS && !isAndroid;
  const sharedGuest = isSharedGuestAccount(user, profile);
  const hasFullAccess = hasFullAccessRole(userRole?.role);
  const productUnavailable = (isIOS || isAndroid) && !sharedGuest && !hasFullAccess && !loadingProduct && !product;

  const displayPrice = useMemo(() => {
    return product?.displayPrice || VAULT_OS_MONTHLY_FALLBACK_PRICE;
  }, [product]);
  const monthlyPriceText = displayPrice.toLowerCase().includes("month")
    ? displayPrice
    : `${displayPrice} per month`;

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/academy/learn", { replace: true });
  }

  async function loadProducts(showToastOnFailure = true) {
    if (!user?.id || (!isIOS && !isAndroid) || sharedGuest || hasFullAccess) return;

    setLoadingProduct(true);
    try {
      const { products } = isAndroid
        ? await GooglePlayMembership.getProducts({ productIds: [VAULT_OS_MONTHLY_PRODUCT_ID] })
        : await StoreKitMembership.getProducts({ productIds: [VAULT_OS_MONTHLY_PRODUCT_ID] });
      console.info("[MembershipUpgrade] Loaded native membership products", products);
      setProduct(products[0] ?? null);
      if (!products[0] && showToastOnFailure) {
        toast({
          title: "Membership unavailable right now",
          description: `${isAndroid ? "The Google Play" : "The App Store"} subscription details could not be loaded right now. Please try again.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[MembershipUpgrade] Failed to load products", error);
      if (showToastOnFailure) {
        toast({
          title: "Could not load membership details",
          description: `${isAndroid ? "The Google Play" : "The App Store"} subscription details could not be loaded right now. Please try again.`,
          variant: "destructive",
        });
      }
    } finally {
      setLoadingProduct(false);
    }
  }

  useEffect(() => {
    if (!user || (!isIOS && !isAndroid) || sharedGuest || hasFullAccess) return;

    let cancelled = false;

    const run = async () => {
      setLoadingProduct(true);
      try {
        const { products } = isAndroid
          ? await GooglePlayMembership.getProducts({ productIds: [VAULT_OS_MONTHLY_PRODUCT_ID] })
          : await StoreKitMembership.getProducts({ productIds: [VAULT_OS_MONTHLY_PRODUCT_ID] });
        if (cancelled) return;
        console.info("[MembershipUpgrade] Loaded native membership products", products);
        setProduct(products[0] ?? null);
        if (!products[0]) {
          toast({
            title: "Membership unavailable right now",
            description: `${isAndroid ? "The Google Play" : "The App Store"} subscription details could not be loaded right now. Please try again.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("[MembershipUpgrade] Failed to load products", error);
        toast({
          title: "Could not load membership details",
          description: `${isAndroid ? "The Google Play" : "The App Store"} subscription details could not be loaded right now. Please try again.`,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoadingProduct(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [user, isIOS, isAndroid, sharedGuest, hasFullAccess, toast]);

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
        signedTransactionInfo: transaction.signedTransactionInfo ?? null,
      },
    });

    if (error) {
      const message = await getFunctionErrorMessage(error);
      console.error("[MembershipUpgrade] activate-ios-membership failed", {
        message,
        error,
      });
      throw new Error(message);
    }

    // Only finish the StoreKit transaction AFTER the backend has recorded
    // the entitlement. If activation fails, the transaction stays
    // unfinished and StoreKit replays it via Transaction.updates on next
    // launch — the reconciler picks it up automatically.
    try {
      await StoreKitMembership.finishTransaction({ transactionId: transaction.transactionId });
    } catch (finishError) {
      console.warn("[MembershipUpgrade] finishTransaction failed (will retry on next launch)", finishError);
    }

    clearMembershipUiState();
    await refetchProfile();
  }

  async function activateAndroidMembership(transaction: GooglePlayMembershipTransaction) {
    console.info("[MembershipUpgrade] Activating Android membership with transaction", {
      productId: transaction.productId,
      orderId: transaction.orderId,
      packageName: transaction.packageName,
      purchaseDate: transaction.purchaseDate,
    });
    const { error } = await supabase.functions.invoke("activate-android-membership", {
      body: {
        productId: transaction.productId,
        purchaseToken: transaction.purchaseToken,
        orderId: transaction.orderId ?? null,
        packageName: transaction.packageName,
        purchaseDate: transaction.purchaseDate,
        isAcknowledged: transaction.isAcknowledged,
      },
    });

    if (error) {
      const message = await getFunctionErrorMessage(error);
      console.error("[MembershipUpgrade] activate-android-membership failed", {
        message,
        error,
      });
      throw new Error(message);
    }

    if (!transaction.isAcknowledged) {
      try {
        await GooglePlayMembership.acknowledgePurchase({ purchaseToken: transaction.purchaseToken });
      } catch (acknowledgeError) {
        console.warn("[MembershipUpgrade] acknowledgePurchase failed (will retry on next launch)", acknowledgeError);
      }
    }

    clearMembershipUiState();
    await refetchProfile();
  }

  async function handlePurchase() {
    if (!user) return;

    if (purchaseUnavailableOnThisPlatform) {
      toast({
        title: "Purchase unavailable here",
        description: "Vault OS purchases are available inside the iOS and Android apps.",
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
      if (isAndroid) {
        const { transaction } = await GooglePlayMembership.purchase({
          productId: VAULT_OS_MONTHLY_PRODUCT_ID,
        });
        console.info("[MembershipUpgrade] Google Play purchase result", transaction);

        await activateAndroidMembership(transaction);
      } else {
        const { transaction } = await StoreKitMembership.purchase({
          productId: VAULT_OS_MONTHLY_PRODUCT_ID,
          appAccountToken: user.id,
        });
        console.info("[MembershipUpgrade] StoreKit purchase result", transaction);

        await activateMembership(transaction);
      }

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
          description: `${isAndroid ? "Google Play is" : "Apple is"} still confirming this subscription.`,
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
    if (!user || (!isIOS && !isAndroid)) return;
    setRestoring(true);
    try {
      const { transactions } = isAndroid
        ? await GooglePlayMembership.restorePurchases()
        : await StoreKitMembership.restorePurchases({ productIds: [VAULT_OS_MONTHLY_PRODUCT_ID] });
      console.info("[MembershipUpgrade] Restore transactions", transactions);

      if (!transactions.length) {
        toast({
          title: "No active purchase found",
          description: `There is no active Vault OS subscription to restore on this ${isAndroid ? "Google Play account" : "Apple ID"}.`,
        });
        return;
      }

      if (isAndroid) {
        await activateAndroidMembership(transactions[0] as GooglePlayMembershipTransaction);
      } else {
        await activateMembership(transactions[0] as MembershipTransaction);
      }
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
      className="academy-main-safe h-[100dvh] overflow-y-auto overflow-x-hidden px-4 py-8 text-foreground"
      style={{
        background: `
          radial-gradient(ellipse 80% 55% at 50% 10%, rgba(59,130,246,0.16) 0%, transparent 55%),
          linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
        `,
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        overscrollBehaviorY: "contain",
        paddingTop: "max(env(safe-area-inset-top, 0px), 2rem)",
        paddingBottom: "calc(max(env(safe-area-inset-bottom, 0px), 1rem) + 1.5rem)",
        minHeight: "100dvh",
        boxSizing: "border-box",
      }}
    >
      <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center">
        <div className="mb-4 flex justify-start">
          <button
            type="button"
            aria-label="Go back"
            onClick={handleBack}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-background/80 text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur transition-colors hover:bg-background active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="rounded-[28px] border border-border/40 bg-card/85 p-7 shadow-[0_14px_50px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Full Access Membership
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight">
            Unlock Vault OS
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {`Upgrade to full access for ${displayPrice} and unlock the complete Vault OS member experience in the Vault OS app.`}
          </p>

          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/10 p-5">
            <p className="text-4xl font-black tracking-tight">{displayPrice}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Auto-renewing monthly subscription billed by {isAndroid ? "Google Play" : "Apple"}.
            </p>
            <div className="mt-4 space-y-1 text-left text-xs text-muted-foreground">
              <p>Subscription: Vault OS Full Access Monthly Clean</p>
              <p>Length: 1 month</p>
              <p>Price: {monthlyPriceText}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/30 bg-background/40 p-4">
            <p className="text-sm font-semibold text-foreground">Subscription Terms</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Review the required legal information before starting your monthly subscription.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-12 justify-between rounded-xl px-4 py-3 text-left"
                onClick={() => openExternalUrl(getVaultOsTermsUrl())}
              >
                <span className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">Terms of Use (EULA)</span>
                  <span className="text-[11px] text-muted-foreground">Open required subscription terms</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-12 justify-between rounded-xl px-4 py-3 text-left"
                onClick={() => openExternalUrl(getVaultOsPrivacyPolicyUrl())}
              >
                <span className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">Privacy Policy</span>
                  <span className="text-[11px] text-muted-foreground">Open data and privacy policy</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              "Full Vault OS app access on your account",
              "Video lessons, tools, live areas, and member-only sections",
              "No web checkout needed inside the Vault OS app",
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
                    Full access attaches to this account after a successful {isAndroid ? "Google Play" : "Apple"} subscription so your app immediately leaves the basic tier.
                  </p>
                </div>
              </div>

              {purchaseUnavailableOnThisPlatform ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-foreground">
                  Full access purchases are only available inside the iOS and Android apps.
                </div>
              ) : null}

              {productUnavailable ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-foreground">
                  The {isAndroid ? "Google Play" : "App Store"} subscription details could not be loaded right now. Use Try again to refresh them.
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                <Button
                  className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
                  onClick={handlePurchase}
                  disabled={purchasing || restoring || loadingProduct || productUnavailable || purchaseUnavailableOnThisPlatform}
                >
                  {purchasing || loadingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {purchaseUnavailableOnThisPlatform
                    ? "Full access unavailable here"
                    : productUnavailable
                      ? "Membership unavailable right now"
                      : `Start full access for ${displayPrice}`}
                </Button>
                {!purchaseUnavailableOnThisPlatform ? (
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-2xl"
                    onClick={handleRestore}
                    disabled={purchasing || restoring || productUnavailable}
                  >
                    {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Restore purchase
                  </Button>
                ) : null}
                {productUnavailable ? (
                  <Button
                    variant="ghost"
                    className="w-full h-11 rounded-2xl"
                    onClick={() => void loadProducts()}
                    disabled={loadingProduct}
                  >
                    Try again
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-11 rounded-2xl"
                  onClick={() => navigate("/academy/settings?section=account&focus=delete-account")}
                >
                  Open Account
                </Button>
              </div>

              <div className="mt-5 rounded-2xl border border-border/30 bg-background/40 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Required Subscription Information</p>
                <p className="mt-1 leading-relaxed">
                  Subscription: Vault OS Full Access Monthly Clean. Duration: 1 month. Price: {monthlyPriceText}. By subscribing, you agree to the Vault OS Terms of Use and acknowledge the Privacy Policy.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <a
                    href={getVaultOsTermsUrl()}
                    target="_self"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    Terms of Use
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={getVaultOsPrivacyPolicyUrl()}
                    target="_self"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    Privacy Policy
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </>
          )}

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {purchaseUnavailableOnThisPlatform ? "Need a different account? " : "Already subscribed? Use Restore purchase. Need a different account? "}
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
