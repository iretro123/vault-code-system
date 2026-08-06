import { useEffect } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { hapticStrong } from "@/lib/nativeFeedback";

function isNativePlatform() {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  if (window.location?.protocol === "capacitor:") return true;
  return /Capacitor/i.test(navigator.userAgent);
}

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

async function registerTokenForCurrentUser(params: {
  token: string;
  userId: string;
  platformKey: string;
  basePlatform: string;
}) {
  const { token, userId, platformKey, basePlatform } = params;

  const { error: rpcError } = await supabase.rpc("register_device_token", {
    _token: token,
    _platform: platformKey,
  });

  if (!rpcError) return;

  console.warn("register_device_token RPC failed, falling back to direct token upsert", rpcError);

  await supabase
    .from("device_tokens")
    .upsert({
      user_id: userId,
      token,
      platform: platformKey,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "token" });

  // Replace legacy plain-platform rows and stale rows for this exact device
  // so one physical device does not keep generating duplicate pushes.
  await supabase
    .from("device_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("platform", platformKey)
    .neq("token", token);

  if (platformKey !== basePlatform) {
    await supabase
      .from("device_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("platform", basePlatform)
      .neq("token", token);
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    if (!isNativePlatform()) return;

    let active = true;
    let removeListeners = async () => {};

    async function getPlatformKey() {
      const basePlatform = Capacitor.getPlatform();
      try {
        const { identifier } = await Device.getId();
        const stableId = String(identifier || "").trim();
        if (stableId) return `${basePlatform}:${stableId}`;
      } catch (err) {
        console.warn("Failed to resolve device id for push token registration", err);
      }
      return basePlatform;
    }

    async function registerPush() {
      try {
        const perm = await PushNotifications.checkPermissions();
        console.info("Push permission status", perm.receive);
        if (perm.receive !== "granted") {
          const request = await PushNotifications.requestPermissions();
          console.info("Push permission request result", request.receive);
          if (request.receive !== "granted") return;
        }
        await PushNotifications.register();
      } catch (err) {
        console.warn("Push registration failed", err);
      }
    }

    async function setupPush() {
      const listeners = await Promise.all<PluginListenerHandle>([
        PushNotifications.addListener("registration", async (token: PushRegistrationToken) => {
          try {
            console.info("Push registration token received", String(token?.value || "").slice(0, 18));
            const platformKey = await getPlatformKey();
            const basePlatform = Capacitor.getPlatform();
            await registerTokenForCurrentUser({
              token: token.value,
              userId,
              platformKey,
              basePlatform,
            });
            console.info("Push token saved for user", userId);
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
    void registerPush();

    return () => {
      active = false;
      void removeListeners();
    };
  }, [userId]);
}
