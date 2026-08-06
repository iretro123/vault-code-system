import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { MembershipProduct } from "@/lib/nativeMembership";

export interface GooglePlayMembershipTransaction {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseToken: string;
  orderId?: string | null;
  packageName: string;
  purchaseDate: string;
  isAcknowledged: boolean;
  purchaseState: number;
}

export interface GooglePlayMembershipTransactionUpdateEvent {
  source: "updates" | "sync";
  transaction: GooglePlayMembershipTransaction;
}

interface GooglePlayMembershipPlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: MembershipProduct[] }>;
  purchase(options: { productId: string }): Promise<{ transaction: GooglePlayMembershipTransaction }>;
  restorePurchases(): Promise<{ transactions: GooglePlayMembershipTransaction[] }>;
  acknowledgePurchase(options: { purchaseToken: string }): Promise<{ acknowledged: boolean }>;
  syncPendingPurchases(): Promise<{ pending: number }>;
  addListener(
    event: "membershipTransactionUpdate",
    listener: (event: GooglePlayMembershipTransactionUpdateEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const GooglePlayMembership = registerPlugin<GooglePlayMembershipPlugin>("GooglePlayMembership");
