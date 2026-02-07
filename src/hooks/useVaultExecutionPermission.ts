/**
 * DISABLED — Returns static values only. No RPC calls, no subscriptions.
 */
export type VaultExecutionPermission = {
  execution_allowed: boolean;
  block_reason: string | null;
  effective_risk_limit: number | null;
  cooldown_active: boolean;
  cooldown_remaining_minutes: number;
  vault_open: boolean;
  discipline_status: string | null;
  protection_level: string | null;
  consistency_level: string | null;
  intervention_required: boolean;
};

export function useVaultExecutionPermission() {
  return {
    loading: false,
    refreshing: false,
    error: null,
    data: null as VaultExecutionPermission | null,
    status: { light: "UNKNOWN" as const, label: "Disabled" },
    refetch: () => {},
  };
}
