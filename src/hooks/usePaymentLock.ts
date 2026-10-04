import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Past-due payment lock, decided by the database (`get_my_payment_lock`).
 * Server RLS denies content on its own; this only drives the recovery screen.
 * Until the database function is deployed the RPC errors and nothing locks.
 */
export function usePaymentLock() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payment-lock", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>)("get_my_payment_lock");
      if (error) return false;
      return data === true;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  return { locked: data === true, loading: !!user?.id && isLoading, refetch };
}

export function shouldShowPaymentLock(o: { locked: boolean; loading: boolean; isAdminBypass: boolean }) {
  return !o.loading && o.locked && !o.isAdminBypass;
}
