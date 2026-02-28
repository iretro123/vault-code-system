import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { supabase } from "@/integrations/supabase/client";

export type AccessStatus = "active" | "trialing" | "past_due" | "canceled" | "none";

interface AccessState {
  status: AccessStatus;
  tier: string | null;
  productKey: string | null;
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const CACHE_KEY = "va_cache_student_access";
const CACHE_TTL = 60_000; // 60s

function readCache(): (AccessState & { ts: number }) | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(state: AccessState) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...state, ts: Date.now() }));
  } catch {}
}

export function useStudentAccess() {
  const { user } = useAuth();
  const { isCEO, isOperator, resolved: permResolved } = useAcademyPermissions();

  const cached = readCache();
  const [state, setState] = useState<AccessState>({
    status: cached?.status ?? "none",
    tier: cached?.tier ?? null,
    productKey: cached?.productKey ?? null,
    hasAccess: cached?.hasAccess ?? false,
    loading: !cached,
    error: null,
    lastUpdated: cached?.lastUpdated ?? null,
  });

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchAccess = useCallback(async () => {
    if (!user?.id) {
      console.log("[AccessGate] No user, setting none");
      setState({ status: "none", tier: null, productKey: null, hasAccess: false, loading: false, error: null, lastUpdated: null });
      return;
    }

    console.log("[AccessGate] Fetching access for", user.id);

    const { data, error } = await supabase.rpc("get_my_access_state" as any);

    if (!mountedRef.current) return;

    if (error) {
      console.error("[AccessGate] RPC error:", error.message);
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      console.log("[AccessGate] No access row found → none");
      const newState: AccessState = { status: "none", tier: null, productKey: null, hasAccess: false, loading: false, error: null, lastUpdated: Date.now() };
      setState(newState);
      writeCache(newState);
      return;
    }

    const status = (["active", "trialing", "past_due", "canceled"].includes(row.status) ? row.status : "none") as AccessStatus;
    const newState: AccessState = {
      status,
      tier: row.tier ?? null,
      productKey: row.product_key ?? null,
      hasAccess: row.has_access === true,
      loading: false,
      error: null,
      lastUpdated: Date.now(),
    };
    console.log("[AccessGate] Resolved:", newState.status, "hasAccess:", newState.hasAccess);
    setState(newState);
    writeCache(newState);
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  // Admin/operator bypass
  const adminBypass = permResolved && (isCEO || isOperator);

  return {
    status: state.status,
    tier: state.tier,
    productKey: state.productKey,
    hasAccess: adminBypass ? true : state.hasAccess,
    loading: state.loading,
    error: state.error,
    refetch: fetchAccess,
    lastUpdated: state.lastUpdated,
    isAdminBypass: adminBypass,
  };
}
