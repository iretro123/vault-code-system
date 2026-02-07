/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export type VaultRank = "LOCKED" | "NOVICE" | "DEVELOPING" | "CONSISTENT" | "PROVEN";

export interface VaultIdentity {
  vaultScore: number;
  vaultLevel: number;
  vaultRank: VaultRank;
  vaultTitle: string;
  nextRank: string;
  progressPercent: number;
  rankColor: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVaultIdentity(): VaultIdentity {
  return {
    vaultScore: 0,
    vaultLevel: 1,
    vaultRank: "LOCKED",
    vaultTitle: "",
    nextRank: "",
    progressPercent: 0,
    rankColor: "muted",
    loading: false,
    refreshing: false,
    error: null,
    refetch: () => {},
  };
}
