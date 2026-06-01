import { useAuth } from "@/hooks/useAuth";

/**
 * Returns whether the current user has the `basic_tier` role.
 * basic_tier = video-only membership, isolated from the full Vault OS app.
 *
 * Reads from AuthContext (which already loads user_roles once at sign-in)
 * to avoid a separate query that can race with the rest of the app.
 */
export function useIsBasicTier() {
  const { userRole, loading } = useAuth();
  return {
    isBasicTier: userRole?.role === "basic_tier",
    loading,
  };
}
