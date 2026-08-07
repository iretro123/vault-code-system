import { useAuth } from "@/hooks/useAuth";
import { isFreeBasic } from "@/lib/entitlements";

/**
 * Returns whether the current user is limited to the Free Basic experience.
 *
 * Deny-by-default: anyone WITHOUT an explicit full-access role (see
 * `src/lib/entitlements.ts`) is treated as Free Basic — including the legacy
 * `free` role and users whose role row failed to load into a known value.
 *
 * Reads from AuthContext (which already loads user_roles once at sign-in)
 * to avoid a separate query that can race with the rest of the app.
 */
export function useIsBasicTier() {
  const { userRole, loading } = useAuth();
  return {
    // While loading we must not claim full access — callers gate on `loading`.
    isBasicTier: isFreeBasic(userRole?.role),
    loading,
  };
}
