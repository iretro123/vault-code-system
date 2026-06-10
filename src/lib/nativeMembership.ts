import { registerPlugin } from "@capacitor/core";

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
}

interface StoreKitMembershipPlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: MembershipProduct[] }>;
  purchase(options: { productId: string; appAccountToken?: string }): Promise<{ transaction: MembershipTransaction }>;
  restorePurchases(options: { productIds: string[] }): Promise<{ transactions: MembershipTransaction[] }>;
}

export const StoreKitMembership = registerPlugin<StoreKitMembershipPlugin>("StoreKitMembership");
