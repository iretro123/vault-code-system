import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type PaymentLockState = "unlocked" | "locked" | "unverified";

/**
 * Past-due payment lock, decided by the database (`get_my_payment_lock`).
 * Server RLS enforces the lock on its own; this drives the app shell.
 * A transient error keeps the last VERIFIED answer (react-query retains data);
 * with no verified answer yet the shell shows a safe retry view, never content.
 */
export function usePaymentLock() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payment-lock", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>)("get_my_payment_lock");
      if (error) throw error;
      return data === true;
    },
    retry: 2,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  const state: PaymentLockState = data === true ? "locked" : data === false ? "unlocked" : isError ? "unverified" : "unlocked";
  return { state, locked: state === "locked", unverified: state === "unverified", loading: !!user?.id && isLoading, refetch };
}

export function shouldShowPaymentLock(o: { locked: boolean; loading: boolean; isAdminBypass: boolean }) {
  return !o.loading && o.locked && !o.isAdminBypass;
}
