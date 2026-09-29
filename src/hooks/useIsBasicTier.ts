import { useStudentAccess } from "@/hooks/useStudentAccess";

/**
 * Returns whether the current user is limited to the Free Basic experience.
 *
 * Uses the shared server entitlement query. A saved role cannot outlive
 * the whitelist/subscription that authorized it.
 */
export function useIsBasicTier() {
  const { hasAccess, loading } = useStudentAccess();
  return {
    // While loading we must not claim full access — callers gate on `loading`.
    isBasicTier: !hasAccess,
    loading,
  };
}
