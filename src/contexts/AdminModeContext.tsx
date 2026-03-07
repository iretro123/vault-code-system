import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";

interface AdminModeState {
  /** True if user toggled admin mode ON */
  adminModeOn: boolean;
  /** True if "Preview as Member" is active (hides all admin UI) */
  previewAsMember: boolean;
  /** Convenience: admin mode is ON and not previewing as member */
  isAdminActive: boolean;
  /** Whether the current user is allowed to toggle admin mode at all */
  canToggle: boolean;
  toggleAdminMode: () => void;
  togglePreviewAsMember: () => void;
}

const AdminModeContext = createContext<AdminModeState>({
  adminModeOn: false,
  previewAsMember: false,
  isAdminActive: false,
  canToggle: false,
  toggleAdminMode: () => {},
  togglePreviewAsMember: () => {},
});

const STORAGE_KEY = "va_admin_mode";
const PREVIEW_KEY = "va_admin_preview_member";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const { isAdmin, isCoach } = useAcademyPermissions();
  const canToggle = isAdmin || isCoach;

  const [adminModeOn, setAdminModeOn] = useState(() => canToggle && readFlag(STORAGE_KEY));
  const [previewAsMember, setPreviewAsMember] = useState(() => readFlag(PREVIEW_KEY));

  // Sync admin mode from localStorage once permissions resolve (fixes race condition)
  useEffect(() => {
    if (canToggle && readFlag(STORAGE_KEY) && !adminModeOn) {
      setAdminModeOn(true);
    }
  }, [canToggle]);

  const toggleAdminMode = useCallback(() => {
    setAdminModeOn((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      if (!next) {
        // turning off admin mode also resets preview
        setPreviewAsMember(false);
        localStorage.setItem(PREVIEW_KEY, "0");
      }
      return next;
    });
  }, []);

  const togglePreviewAsMember = useCallback(() => {
    setPreviewAsMember((prev) => {
      const next = !prev;
      localStorage.setItem(PREVIEW_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const isAdminActive = canToggle && adminModeOn && !previewAsMember;

  const value = useMemo(
    () => ({ adminModeOn, previewAsMember, isAdminActive, canToggle, toggleAdminMode, togglePreviewAsMember }),
    [adminModeOn, previewAsMember, isAdminActive, canToggle, toggleAdminMode, togglePreviewAsMember],
  );

  return <AdminModeContext.Provider value={value}>{children}</AdminModeContext.Provider>;
}

export function useAdminMode() {
  return useContext(AdminModeContext);
}
