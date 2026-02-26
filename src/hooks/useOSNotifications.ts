import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Browser / OS notification delivery layer.
 *
 * Phase 1: Uses Notification API when tab is hidden and permission is granted.
 * Does NOT add any UI elements. Permission is requested only via `requestIfNeeded()`.
 *
 * Integrates on top of existing realtime notification events (useAcademyNotifications).
 */

// Dedupe: track notification IDs already shown this session
const shownIds = new Set<string>();

/** Feature-detect browser Notification API */
function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Current permission state (safe for SSR) */
function currentPermission(): NotificationPermission | "unsupported" {
  if (!isSupported()) return "unsupported";
  return Notification.permission;
}

/** Map notification type to icon emoji (used as badge fallback) */
function iconForType(type: string): string | undefined {
  // We could provide a URL to an icon here for richer notifications.
  // For now return undefined (browser default).
  return undefined;
}

/** Deep-link path for notification click */
function pathForType(type: string, linkPath?: string | null): string {
  if (linkPath) return linkPath;
  switch (type) {
    case "coach_reply":
      return "/academy/my-questions";
    case "announcement":
      return "/academy/community";
    case "new_module":
      return "/academy/learn";
    case "live_soon":
      return "/academy/live";
    default:
      return "/academy/home";
  }
}

export interface OSNotifyPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  linkPath?: string | null;
}

export function useOSNotifications() {
  const { user } = useAuth();
  const permissionAsked = useRef(false);

  // ── Request permission (call ONLY from user-gesture handlers) ──
  const requestIfNeeded = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) return false;
    const perm = Notification.permission;
    if (perm === "granted") return true;
    if (perm === "denied") return false;
    // "default" — ask once per session
    if (permissionAsked.current) return false;
    permissionAsked.current = true;
    try {
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }, []);

  // ── Show an OS notification (if eligible) ──
  const notify = useCallback(
    (payload: OSNotifyPayload) => {
      if (!user) return;
      if (!isSupported()) return;
      if (Notification.permission !== "granted") return;

      // Dedupe
      if (shownIds.has(payload.id)) return;
      shownIds.add(payload.id);
      // Cap set size
      if (shownIds.size > 200) {
        const first = shownIds.values().next().value;
        if (first) shownIds.delete(first);
      }

      // Only show OS notification when tab is hidden/unfocused
      if (document.visibilityState === "visible" && document.hasFocus()) return;

      try {
        const n = new Notification(payload.title, {
          body: payload.body,
          icon: "/favicon.ico",
          tag: payload.id, // browser-level dedupe
          requireInteraction: false,
          silent: false,
        });

        n.onclick = () => {
          window.focus();
          const path = pathForType(payload.type, payload.linkPath);
          // Use history if available (SPA navigation)
          if (window.location.pathname !== path) {
            window.location.href = path;
          }
          n.close();
        };

        // Auto-close after 8s to avoid clutter
        setTimeout(() => n.close(), 8000);
      } catch {
        // Silently fail (e.g. insecure context)
      }
    },
    [user]
  );

  // Clean up dedupe set on logout
  useEffect(() => {
    if (!user) {
      shownIds.clear();
    }
  }, [user]);

  return { requestIfNeeded, notify, isSupported: isSupported() };
}
