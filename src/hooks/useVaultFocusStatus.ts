/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
type FocusStatus =
  | { active: false }
  | {
      active: true;
      session_id: string;
      ends_at: string;
      remaining_seconds: number;
      max_trades: number;
      trades_taken: number;
      trades_remaining: number;
      cooldown_after_loss_minutes: number;
      goals: string | null;
    };

export function useVaultFocusStatus() {
  return {
    data: { active: false } as FocusStatus,
    loading: false,
    refreshing: false,
    error: null,
    refetch: () => {},
  };
}
