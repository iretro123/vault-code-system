import { useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  lastUpdated: number | null;
}

const CACHE_KEY = "va_cache_student_access";

function readCache(): AccessState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.ts || 0) > 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(state: AccessState) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...state, ts: Date.now() }));
  } catch {
    void 0;
  }
}

async function fetchAccessState(userId: string): Promise<AccessState> {
  const { data, error } = await supabase.rpc("get_my_access_state");

  if (error) {
    const fallback = readCache();
    if (fallback) return fallback;
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    const result: AccessState = { status: "none", tier: null, productKey: null, hasAccess: false, lastUpdated: Date.now() };
    writeCache(result);
    return result;
  }

  const status = (["active", "trialing", "past_due", "canceled"].includes(row.status) ? row.status : "none") as AccessStatus;
  const result: AccessState = {
    status,
    tier: row.tier ?? null,
    productKey: row.product_key ?? null,
    hasAccess: row.has_access === true,
    lastUpdated: Date.now(),
  };
  writeCache(result);
  return result;
}

export function useStudentAccess() {
  const { user, profile } = useAuth();
  const { isCEO, isAdmin, isCoach, isOperator, resolved: permResolved } = useAcademyPermissions();
  const queryClient = useQueryClient();
  const retryAttemptedRef = useRef(false);

  const cached = readCache();

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-access", user?.id],
    queryFn: () => fetchAccessState(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: cached ?? undefined,
    refetchOnWindowFocus: false,
  });

  const state = data ?? { status: "none" as AccessStatus, tier: null, productKey: null, hasAccess: false, lastUpdated: null };

  // Auto-retry provisioning once per session
  useEffect(() => {
    if (isLoading) return;
    if (state.status !== "none") return;
    if (!user?.id) return;
    if (retryAttemptedRef.current) return;
    retryAttemptedRef.current = true;

    const userEmail = (profile as { email?: string | null } | null)?.email || user.email;
    if (!userEmail) return;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch(`${SUPABASE_URL}/functions/v1/provision-manual-access`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: userEmail.trim().toLowerCase(),
            auth_user_id: user.id,
          }),
        });

        const result = await res.json();
        if (result.provisioned === true) {
          queryClient.invalidateQueries({ queryKey: ["student-access", user.id] });
        }
      } catch {
        void 0;
      }
    })();
  }, [isLoading, state.status, user?.id, profile]);

  const adminBypass = permResolved && (isCEO || isAdmin || isCoach || isOperator);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["student-access", user?.id] });
  }, [queryClient, user?.id]);

  return {
    status: state.status,
    tier: state.tier,
    productKey: state.productKey,
    hasAccess: adminBypass ? true : state.hasAccess,
    loading: isLoading || !permResolved,
    error: error?.message ?? null,
    refetch,
    lastUpdated: state.lastUpdated,
    isAdminBypass: adminBypass,
  };
}
