/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export type FeedbackType = "critical" | "warning" | "positive" | "neutral";

export interface VaultFeedback {
  message: string;
  type: FeedbackType;
  priority: number;
  action: string;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVaultFeedback(): VaultFeedback {
  return {
    message: "",
    type: "neutral",
    priority: 3,
    action: "",
    loading: false,
    error: null,
    refetch: () => {},
  };
}
