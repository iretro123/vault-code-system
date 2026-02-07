/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export type VaultTier = "ELITE" | "STRONG" | "DEVELOPING" | "DANGEROUS" | "LOCKED";
export type VaultTrend = "improving" | "stable" | "declining";

export interface VaultScore {
  score: number;
  tier: VaultTier;
  trend: VaultTrend;
  components: {
    discipline: number;
    adherence: number;
    violation: number;
    risk: number;
    emotion: number;
  };
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVaultScore(): VaultScore {
  return {
    score: 0,
    tier: "LOCKED",
    trend: "stable",
    components: { discipline: 0, adherence: 0, violation: 0, risk: 0, emotion: 0 },
    loading: false,
    error: null,
    refetch: () => {},
  };
}
