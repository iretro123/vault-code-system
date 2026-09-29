import { syncExistingWebPush } from "@/lib/webPush";
import { useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useAuth } from "@/hooks/useAuth";
import { hapticStrong } from "@/lib/nativeFeedback";
import {
  getPlatformKey,
  getPushPermissionState,
  isNativePushPlatform,
  registerTokenForCurrentUser,
} from "@/lib/pushPermission";

const HAPTIC_NOTIFICATION_TYPES = new Set([
  "chat_message", "pulse_zone", "live_now",
]);

interface PushRegistrationToken {
  value: string;
}

interface PushActionPerformedNotification {
  notification?: {
    data?: Record<string, unknown>;
  };
}

interface PushReceivedNotification {
  data?: {
    type?: string;
  };
}

/**
 * Keeps push listeners mounted and silently re-registers the device token
 * whenever permission is ALREADY granted. It never triggers the OS prompt —
 * that only happens from an explicit user tap (see NotificationOptInBanner).
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (userId && !isNativePushPlatform()) void syncExistingWebPush().catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (!isNativePushPlatform()) return;

    let active = true;
    let removeListeners = async () => {};

    async function silentRegisterIfGranted() {
      try {
        if (!active || await getPushPermissionState() !== "granted" || !active) return;
        await PushNotifications.register();
      } catch (err) {
        console.warn("Push re-registration failed", err);
      }
    }

    async function setupPush() {
      const results = await Promise.allSettled<PluginListenerHandle>([
        PushNotifications.addListener("registration", async (token: PushRegistrationToken) => {
          try {
            if (!active) return;
            const platformKey = await getPlatformKey();
            if (!active) return;
            const basePlatform = Capacitor.getPlatform();
            await registerTokenForCurrentUser({
              token: token.value,
              userId,
              platformKey,
              basePlatform,
            });
          } catch (err) {
            console.warn("Failed to save push token", err);
          }
        }),
        PushNotifications.addListener("pushNotificationActionPerformed", (notification: PushActionPerformedNotification) => {
          const data = notification.notification?.data || {};
          const linkPath = typeof data.link_path === "string" ? data.link_path : "/academy/community";
          if (active && linkPath.startsWith("/academy/") && !linkPath.includes("\\")) {
            window.location.assign(linkPath);
          }
        }),
        PushNotifications.addListener("pushNotificationReceived", (notification: PushReceivedNotification) => {
          if (active && notification.data?.type && HAPTIC_NOTIFICATION_TYPES.has(notification.data.type)) {
            void hapticStrong();
          }
        }),
        PushNotifications.addListener("registrationError", (err: unknown) => {
          console.warn("Push registration error", err);
        }),
      ]);

      const listeners = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      removeListeners = async () => {
        await Promise.allSettled(listeners.map((listener) => listener.remove()));
      };

      if (results.some(result => result.status === "rejected")) {
        await removeListeners();
        throw new Error("Push listener setup failed");
      }
      if (!active) {
        await removeListeners();
      }
    }

    // The native registration event can arrive immediately; listen first.
    void setupPush().then(silentRegisterIfGranted).catch((err) => console.warn("Push listeners unavailable", err));

    return () => {
      active = false;
      void removeListeners();
    };
  }, [userId]);
}
