/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export function useVaultSessionIntegrity() {
  return {
    loading: false,
    refreshing: false,
    error: null,
    data: { trades_today: 0, verified_trades_today: 0, integrity_percent: 100 },
    trades: 0,
    verified: 0,
    integrity: 100,
    refetch: () => {},
  };
}
