import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
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

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!isNativePlatform()) return;

    let active = true;
    let removeListeners = async () => {};

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
      const listeners = await Promise.all([
        PushNotifications.addListener("registration", async (token: any) => {
          try {
            console.info("Push registration token received", String(token?.value || "").slice(0, 18));
            await supabase
              .from("device_tokens" as any)
              .upsert({
                user_id: user.id,
                token: token.value,
                platform: Capacitor.getPlatform(),
                last_seen_at: new Date().toISOString(),
              }, { onConflict: "token" });
            console.info("Push token saved for user", user.id);
          } catch (err) {
            console.warn("Failed to save push token", err);
          }
        }),
        PushNotifications.addListener("pushNotificationActionPerformed", (notification: any) => {
          const data = (notification?.notification as any)?.data || {};
          const linkPath = data.link_path || "/academy/community";
          if (linkPath) {
            window.location.assign(linkPath);
          }
        }),
        PushNotifications.addListener("pushNotificationReceived", (notification: any) => {
          const data = (notification as any)?.data || {};
          if (data?.type && HAPTIC_NOTIFICATION_TYPES.has(data.type)) {
            void hapticStrong();
          }
        }),
        PushNotifications.addListener("registrationError", (err: any) => {
          console.warn("Push registration error", err);
        }),
      ]);

      removeListeners = async () => {
        await Promise.allSettled(listeners.map((listener: any) => listener.remove()));
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
  }, [user?.id]);
}
