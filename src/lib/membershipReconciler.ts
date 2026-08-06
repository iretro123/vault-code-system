import { supabase } from "@/integrations/supabase/client";
import { isNativeAndroidApp, isNativeIOSApp } from "@/lib/platform";
import {
  GooglePlayMembership,
  type GooglePlayMembershipTransaction,
  type GooglePlayMembershipTransactionUpdateEvent,
} from "@/lib/googlePlayMembership";
import {
  StoreKitMembership,
  type MembershipTransaction,
  type MembershipTransactionUpdateEvent,
} from "@/lib/nativeMembership";
import { VAULT_OS_MONTHLY_PRODUCT_ID } from "@/lib/membership";

/**
 * StoreKit → Supabase entitlement reconciler.
 *
 * Fixes the original bug where a paid Apple purchase never granted access
 * because the StoreKit transaction was finished before our backend recorded
 * it. Now:
 *   1. iOS never calls transaction.finish() until JS confirms activation.
 *   2. This module listens for every Transaction.updates / .unfinished event
 *      and calls activate-ios-membership.
 *   3. On every sign-in and app resume it also asks StoreKit to replay any
 *      pending transactions, so an interrupted purchase is healed silently.
 */

let listenerInstalled = false;
let androidListenerInstalled = false;
let visibilityListenerInstalled = false;
let inFlight = new Set<string>();
let lastReconcileUserId: string | null = null;

async function getFunctionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Membership activation failed.";
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
      console.warn("[membershipReconciler] Could not decode function error body", decodeError);
      // Keep the SDK fallback if the error body cannot be decoded.
    }
  }

  return fallback;
}

async function activateAndFinish(transaction: MembershipTransaction) {
  const key = transaction.transactionId;
  if (!key || inFlight.has(key)) return;
  inFlight.add(key);
  try {
    // We only reconcile the Vault OS full-access product.
    if (transaction.productId !== VAULT_OS_MONTHLY_PRODUCT_ID) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      // No signed-in user — leave transaction unfinished so we can retry
      // after the user signs in. Transaction.unfinished will replay it.
      console.info("[membershipReconciler] Skipping activation: no active session");
      return;
    }

    console.info("[membershipReconciler] Activating pending StoreKit transaction", key);
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
      console.warn("[membershipReconciler] Activation failed; leaving transaction unfinished", {
        message,
        error,
      });
      return;
    }

    await StoreKitMembership.finishTransaction({ transactionId: key });
    console.info("[membershipReconciler] Activated + finished StoreKit transaction", key);
  } catch (err) {
    console.warn("[membershipReconciler] Reconciler error", err);
  } finally {
    inFlight.delete(key);
  }
}

async function activateAndroidAndAcknowledge(transaction: GooglePlayMembershipTransaction) {
  const key = transaction.purchaseToken || transaction.transactionId;
  if (!key || inFlight.has(key)) return;
  inFlight.add(key);
  try {
    if (transaction.productId !== VAULT_OS_MONTHLY_PRODUCT_ID) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.info("[membershipReconciler] Skipping Google Play activation: no active session");
      return;
    }

    console.info("[membershipReconciler] Activating pending Google Play purchase", {
      productId: transaction.productId,
      orderId: transaction.orderId,
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
      console.warn("[membershipReconciler] Google Play activation failed; leaving purchase unacknowledged", {
        message,
        error,
      });
      return;
    }

    if (!transaction.isAcknowledged) {
      await GooglePlayMembership.acknowledgePurchase({ purchaseToken: transaction.purchaseToken });
    }
    console.info("[membershipReconciler] Activated + acknowledged Google Play purchase", key);
  } catch (err) {
    console.warn("[membershipReconciler] Android reconciler error", err);
  } finally {
    inFlight.delete(key);
  }
}

/** Register the persistent StoreKit listener. Safe to call multiple times. */
export function installMembershipReconciler() {
  if (isNativeIOSApp() && !listenerInstalled) {
    listenerInstalled = true;

    StoreKitMembership.addListener(
      "membershipTransactionUpdate",
      (event: MembershipTransactionUpdateEvent) => {
        void activateAndFinish(event.transaction);
      },
    ).catch((err) => {
      console.warn("[membershipReconciler] Failed to attach StoreKit listener", err);
    });
  }

  if (isNativeAndroidApp() && !androidListenerInstalled) {
    androidListenerInstalled = true;

    GooglePlayMembership.addListener(
      "membershipTransactionUpdate",
      (event: GooglePlayMembershipTransactionUpdateEvent) => {
        void activateAndroidAndAcknowledge(event.transaction);
      },
    ).catch((err) => {
      console.warn("[membershipReconciler] Failed to attach Google Play listener", err);
    });
  }

  if (visibilityListenerInstalled) return;
  visibilityListenerInstalled = true;

  // On resume, replay any pending transactions and re-check restore.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void reconcileMembershipNow();
    }
  });
}

/**
 * Force a reconciliation pass. Called on sign-in and app resume.
 * Silent — no toasts, no navigation.
 */
export async function reconcileMembershipNow(userId?: string) {
  if (!isNativeIOSApp() && !isNativeAndroidApp()) return;
  if (userId) lastReconcileUserId = userId;

  try {
    if (isNativeAndroidApp()) {
      await GooglePlayMembership.syncPendingPurchases().catch(() => ({ pending: 0 }));
      const { transactions } = await GooglePlayMembership.restorePurchases();
      for (const tx of transactions) {
        await activateAndroidAndAcknowledge(tx);
      }
      return;
    }

    // 1. Ask StoreKit to re-emit anything that's still unfinished.
    await StoreKitMembership.syncPendingTransactions().catch(() => ({ pending: 0 }));

    // 2. Also scan current entitlements — this catches a subscription that
    //    was purchased on another device or after a fresh install, and any
    //    Ask-to-Buy approval that came in while the app was closed.
    const { transactions } = await StoreKitMembership.restorePurchases({
      productIds: [VAULT_OS_MONTHLY_PRODUCT_ID],
      sync: false,
    });
    for (const tx of transactions) {
      await activateAndFinish(tx);
    }
  } catch (err) {
    console.info("[membershipReconciler] Silent reconcile skipped", err);
  }
}

export function getLastReconciledUserId() {
  return lastReconcileUserId;
}
