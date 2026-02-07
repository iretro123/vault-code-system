/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export type ProtectionLevel = "NONE" | "CAUTION" | "RESTRICTED" | "LOCKDOWN";

export interface VaultProtectionStatus {
  protectionActive: boolean;
  protectionLevel: ProtectionLevel;
  protectionReason: string;
  riskRestrictionFactor: number;
  tradeCooldownMinutes: number;
  emotionalRisk: boolean;
  revengeTradingRisk: boolean;
  overtradingRisk: boolean;
  disciplineDeteriorationRisk: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVaultProtectionStatus(): VaultProtectionStatus {
  return {
    protectionActive: false,
    protectionLevel: "NONE",
    protectionReason: "",
    riskRestrictionFactor: 1.0,
    tradeCooldownMinutes: 0,
    emotionalRisk: false,
    revengeTradingRisk: false,
    overtradingRisk: false,
    disciplineDeteriorationRisk: false,
    loading: false,
    error: null,
    refetch: () => {},
  };
}
