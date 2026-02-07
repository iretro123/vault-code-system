/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export interface MistakeAnalysis {
  mistakeType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  impactScore: number;
  recommendedFix: string;
}

export interface VaultMistakeAnalysisResult {
  mistakes: MistakeAnalysis[];
  loading: boolean;
  refetch: () => void;
}

export function useVaultMistakeAnalysis(): VaultMistakeAnalysisResult {
  return { mistakes: [], loading: false, refetch: () => {} };
}
