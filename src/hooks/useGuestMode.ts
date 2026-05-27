import { useEffect, useState } from "react";
import { isGuestMode } from "@/lib/guestMode";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns true when the current visitor is browsing in guest (view-only) mode
 * — i.e. they have no authenticated user but have opted into the guest preview.
 */
export function useGuestMode(): boolean {
  const { user, loading } = useAuth();
  const [guest, setGuest] = useState<boolean>(() => isGuestMode());

  useEffect(() => {
    const handler = () => setGuest(isGuestMode());
    window.addEventListener("storage", handler);
    window.addEventListener("guest-mode-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("guest-mode-changed", handler);
    };
  }, []);

  if (loading) return guest;
  return !user && guest;
}
