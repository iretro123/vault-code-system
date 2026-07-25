import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface MembershipProduct {
  productId: string;
  title: string;
  description: string;
  displayPrice: string;
  periodLabel?: string | null;
  hasActiveSubscription: boolean;
}

export interface MembershipTransaction {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: string;
  expirationDate?: string | null;
  environment?: string | null;
  ownershipType?: string | null;
  appAccountToken?: string | null;
  signedTransactionInfo?: string | null;
}

export interface MembershipTransactionUpdateEvent {
  source: "updates" | "unfinished" | "sync";
  transaction: MembershipTransaction;
}

interface StoreKitMembershipPlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: MembershipProduct[] }>;
  purchase(options: { productId: string; appAccountToken?: string }): Promise<{ transaction: MembershipTransaction }>;
  restorePurchases(options: { productIds: string[]; sync?: boolean }): Promise<{ transactions: MembershipTransaction[] }>;
  /** Finalize a StoreKit transaction after the backend confirmed activation. */
  finishTransaction(options: { transactionId: string }): Promise<{ finished: boolean }>;
  /** Re-emit any Transaction.unfinished entries via membershipTransactionUpdate events. */
  syncPendingTransactions(): Promise<{ pending: number }>;
  addListener(
    event: "membershipTransactionUpdate",
    listener: (event: MembershipTransactionUpdateEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const StoreKitMembership = registerPlugin<StoreKitMembershipPlugin>("StoreKitMembership");
