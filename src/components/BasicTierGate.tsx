import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsBasicTier } from "@/hooks/useIsBasicTier";

/**
 * Wrap routes that should only be reachable by basic_tier members.
 * - Unauthenticated → /create-account
 * - Authenticated but not basic_tier → /academy/home (full app)
 */
export function BasicTierGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isBasicTier } = useIsBasicTier();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/create-account" replace state={{ from: location }} />;
  }

  if (!isBasicTier) {
    return <Navigate to="/academy/home" replace />;
  }

  return <>{children}</>;
}
