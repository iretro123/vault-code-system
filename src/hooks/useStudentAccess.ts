import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { supabase } from "@/integrations/supabase/client";
import { isLocalDesignPreview } from "@/integrations/supabase/localPreviewFetch";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export type AccessStatus = "active" | "trialing" | "past_due" | "canceled" | "none";

interface AccessState {
  status: AccessStatus;
  tier: string | null;
  productKey: string | null;
  hasAccess: boolean;
  lastUpdated: number | null;
}

const provisioningAttempts = new Set<string>();

async function fetchAccessState(userId: string): Promise<AccessState> {
  // This STABLE, SELECT-only RPC reads the signed-in caller's access decision.
  const { data, error } = await supabase.rpc("get_my_access_state", {} as never, { get: true });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    const result: AccessState = { status: "none", tier: null, productKey: null, hasAccess: false, lastUpdated: Date.now() };
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
  return result;
}

export function useStudentAccess() {
  const { user, profile, refetchProfile } = useAuth();
  const { isCEO, isAdmin, isCoach, isOperator, resolved: permResolved } = useAcademyPermissions();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-access", user?.id],
    queryFn: () => fetchAccessState(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const state = data ?? { status: "none" as AccessStatus, tier: null, productKey: null, hasAccess: false, lastUpdated: null };

  // Auto-retry provisioning once per session
  useEffect(() => {
    // The design preview must never provision or change live membership access.
    if (isLocalDesignPreview()) return;
    if (isLoading) return;
    if (state.status !== "none") return;
    if (!user?.id) return;
    if (provisioningAttempts.has(user.id)) return;
    provisioningAttempts.add(user.id);

    const userEmail = user.email;
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
  const hasBypassAccess = adminBypass;

  const refetch = useCallback(async () => {
    await refetchProfile();
    await queryClient.invalidateQueries({ queryKey: ["student-access", user?.id] });
    await queryClient.invalidateQueries({ queryKey: ["academy-permissions", user?.id] });
  }, [queryClient, user?.id, refetchProfile]);

  return {
    status: state.status,
    tier: state.tier,
    productKey: state.productKey,
    hasAccess: !error && state.hasAccess,
    loading: isLoading || !permResolved,
    error: error?.message ?? null,
    refetch,
    lastUpdated: state.lastUpdated,
    isAdminBypass: hasBypassAccess,
  };
}
