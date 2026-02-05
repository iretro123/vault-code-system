import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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

type State = {
  loading: boolean;
  error: string | null;
  data: VaultExecutionPermission | null;
};

export function useVaultExecutionPermission() {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ loading: true, error: null, data: null });

  const fetchPermission = useCallback(async () => {
    if (!user) {
      setState({ loading: false, error: "Not authenticated", data: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    const { data, error } = await supabase.rpc("get_vault_execution_permission", {
      _user_id: user.id,
    });

    if (error) {
      console.error("Error fetching vault execution permission:", error);
      setState({ loading: false, error: error.message, data: null });
      return;
    }

    if (data && data.length > 0) {
      const row = data[0];
      setState({
        loading: false,
        error: null,
        data: {
          execution_allowed: row.execution_allowed,
          block_reason: row.block_reason,
          effective_risk_limit: Number(row.effective_risk_limit),
          cooldown_active: row.cooldown_active,
          cooldown_remaining_minutes: row.cooldown_remaining_minutes,
          vault_open: row.vault_open,
          discipline_status: row.discipline_status,
          protection_level: row.protection_level,
          consistency_level: row.consistency_level,
          intervention_required: row.intervention_required,
        },
      });
    } else {
      setState({ loading: false, error: "No permission data returned", data: null });
    }
  }, [user]);

  useEffect(() => {
    fetchPermission();
  }, [fetchPermission]);

  // Realtime: refresh on vault_events / trade_entries changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`vault-exec-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vault_events", filter: `user_id=eq.${user.id}` },
        () => fetchPermission()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trade_entries", filter: `user_id=eq.${user.id}` },
        () => fetchPermission()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vault_daily_checklist", filter: `user_id=eq.${user.id}` },
        () => fetchPermission()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPermission]);

  const status = useMemo(() => {
    const d = state.data;
    if (!d) return { light: "UNKNOWN" as const, label: "Loading…" };

    if (!d.execution_allowed) return { light: "RED" as const, label: d.block_reason ?? "Blocked" };

    // Allowed but in restricted modes
    if (d.protection_level === "RESTRICTED" || d.consistency_level === "UNSTABLE") {
      return { light: "YELLOW" as const, label: "Restricted" };
    }

    if (d.protection_level === "CAUTION" || d.consistency_level === "WARNING") {
      return { light: "YELLOW" as const, label: "Caution" };
    }

    return { light: "GREEN" as const, label: "Cleared" };
  }, [state.data]);

  return {
    ...state,
    status,
    refetch: fetchPermission,
  };
}
