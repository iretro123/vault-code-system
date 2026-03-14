import { Navigate } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface FeatureFlagGateProps {
  pageKey: string;
  children: React.ReactNode;
}

export function FeatureFlagGate({ pageKey, children }: FeatureFlagGateProps) {
  const { isPageEnabled, isLoading } = useFeatureFlags();
  const { roleName, isOperator } = useAcademyPermissions();
  const isAdmin = roleName === "CEO" || isOperator;
  const toastShown = useRef(false);

  const enabled = isPageEnabled(pageKey);

  // vault-os is hard-blocked for everyone, including admins
  const hardBlocked = pageKey === "vault-os" && !enabled;

  useEffect(() => {
    if (!isLoading && !enabled && !isAdmin && !toastShown.current) {
      toastShown.current = true;
      toast.info("This page is under development.");
    }
  }, [isLoading, enabled, isAdmin]);

  if (isLoading) return null;
  if (hardBlocked || (!enabled && !isAdmin)) return <Navigate to="/academy/home" replace />;

  return <>{children}</>;
}
