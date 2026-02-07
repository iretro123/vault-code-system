/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export type ConsistencyLevel = "EXCELLENT" | "GOOD" | "DEVELOPING" | "UNSTABLE" | "CRITICAL";
export type TrendDirection = "IMPROVING" | "STABLE" | "DECLINING" | "COLLAPSING";

export interface VaultConsistencyStatus {
  consistencyScore: number;
  consistencyLevel: ConsistencyLevel;
  trendDirection: TrendDirection;
  disciplineVelocity: number;
  riskVelocity: number;
  emotionalStability: number;
  violationTrend: number;
  interventionRequired: boolean;
  recommendedRiskModifier: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVaultConsistencyStatus(): VaultConsistencyStatus {
  return {
    consistencyScore: 0,
    consistencyLevel: "GOOD",
    trendDirection: "STABLE",
    disciplineVelocity: 0,
    riskVelocity: 0,
    emotionalStability: 100,
    violationTrend: 0,
    interventionRequired: false,
    recommendedRiskModifier: 1.0,
    loading: false,
    error: null,
    refetch: () => {},
  };
}
