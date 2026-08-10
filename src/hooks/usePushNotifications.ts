import { useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useAuth } from "@/hooks/useAuth";
import { hapticStrong } from "@/lib/nativeFeedback";
import {
  getPlatformKey,
  isNativePushPlatform,
  registerTokenForCurrentUser,
} from "@/lib/pushPermission";

const HAPTIC_NOTIFICATION_TYPES = new Set([
  "mention",
  "rz_message",
  "live_now",
  "announcement",
  "new_module",
  "motivation",
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
    if (!userId) return;
    if (!isNativePushPlatform()) return;

    let active = true;
    let removeListeners = async () => {};

    async function silentRegisterIfGranted() {
      try {
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive !== "granted") return;
        await PushNotifications.register();
      } catch (err) {
        console.warn("Push re-registration failed", err);
      }
    }

    async function setupPush() {
      const listeners = await Promise.all<PluginListenerHandle>([
        PushNotifications.addListener("registration", async (token: PushRegistrationToken) => {
          try {
            const platformKey = await getPlatformKey();
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
          if (linkPath) {
            window.location.assign(linkPath);
          }
        }),
        PushNotifications.addListener("pushNotificationReceived", (notification: PushReceivedNotification) => {
          if (notification.data?.type && HAPTIC_NOTIFICATION_TYPES.has(notification.data.type)) {
            void hapticStrong();
          }
        }),
        PushNotifications.addListener("registrationError", (err: unknown) => {
          console.warn("Push registration error", err);
        }),
      ]);

      removeListeners = async () => {
        await Promise.allSettled(listeners.map((listener) => listener.remove()));
      };

      if (!active) {
        await removeListeners();
      }
    }

    void setupPush();
    void silentRegisterIfGranted();

    return () => {
      active = false;
      void removeListeners();
    };
  }, [userId]);
}
