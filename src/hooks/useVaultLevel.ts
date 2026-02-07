/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export interface VaultLevel {
  level: number;
  xp: number;
  xpToNextLevel: number;
  progressPercent: number;
  title: string;
  rank: string;
  nextTitle: string;
  loading: boolean;
  refreshing: boolean;
  refetch: () => void;
}

export function useVaultLevel(): VaultLevel {
  return {
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    progressPercent: 0,
    title: "",
    rank: "",
    nextTitle: "",
    loading: false,
    refreshing: false,
    refetch: () => {},
  };
}
