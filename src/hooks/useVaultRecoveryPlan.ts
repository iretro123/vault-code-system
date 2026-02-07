/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export interface VaultRecoveryPlan {
  isLocked: boolean;
  lockReason: string;
  tasksRequired: number;
  tasksCompleted: number;
  progressPercent: number;
  nextAction: string;
  estimatedUnlockTime: string;
  tasks: { id: string; title: string; description: string; completed: boolean; order: number }[];
  loading: boolean;
  refetch: () => void;
}

export function useVaultRecoveryPlan(): VaultRecoveryPlan {
  return {
    isLocked: false,
    lockReason: "",
    tasksRequired: 0,
    tasksCompleted: 0,
    progressPercent: 100,
    nextAction: "",
    estimatedUnlockTime: "",
    tasks: [],
    loading: false,
    refetch: () => {},
  };
}
