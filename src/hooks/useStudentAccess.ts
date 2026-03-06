import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
  const { user, profile } = useAuth();
  const { isCEO, isAdmin, isCoach, isOperator, resolved: permResolved } = useAcademyPermissions();

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
  const retryAttemptedRef = useRef(false);
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

  // Auto-retry provisioning: if status is "none" and user is logged in,
  // attempt to call provision-manual-access ONE TIME per session.
  // This catches users who signed up before the auth-header fix,
  // or whose provisioning silently failed for any reason.
  useEffect(() => {
    if (state.loading) return;
    if (state.status !== "none") return;
    if (!user?.id) return;
    if (retryAttemptedRef.current) return;

    retryAttemptedRef.current = true;

    const userEmail = (profile as any)?.email || user.email;
    if (!userEmail) {
      console.log("[AccessGate] No email available for auto-provision retry");
      return;
    }

    (async () => {
      try {
        console.log("[AccessGate] Status is 'none' — attempting auto-provision for", userEmail);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.log("[AccessGate] No session token for auto-provision");
          return;
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/provision-manual-access`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: userEmail.trim().toLowerCase(),
            auth_user_id: user.id,
          }),
        });

        const result = await res.json();
        console.log("[AccessGate] Auto-provision result:", result);

        if (result.provisioned === true && mountedRef.current) {
          console.log("[AccessGate] Auto-provision succeeded — refreshing access");
          await fetchAccess();
        }
      } catch (err) {
        console.error("[AccessGate] Auto-provision error:", err);
      }
    })();
  }, [state.loading, state.status, user?.id, profile, fetchAccess]);

  // Admin/operator bypass
  const adminBypass = permResolved && (isCEO || isAdmin || isCoach || isOperator);

  return {
    status: state.status,
    tier: state.tier,
    productKey: state.productKey,
    hasAccess: adminBypass ? true : state.hasAccess,
    loading: state.loading || !permResolved,
    error: state.error,
    refetch: fetchAccess,
    lastUpdated: state.lastUpdated,
    isAdminBypass: adminBypass,
  };
}
