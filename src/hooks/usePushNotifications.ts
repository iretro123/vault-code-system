import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { hapticStrong } from "@/lib/nativeFeedback";

function isNativePlatform() {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  if (window.location?.protocol === "capacitor:") return true;
  return /Capacitor/i.test(navigator.userAgent);
}

export function usePushNotifications() {
  const { user } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (!isNativePlatform()) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const _pnMod = "@capacitor/push-notifications";
    import(/* @vite-ignore */ _pnMod).then(({ PushNotifications }: any) => {
      async function registerPush() {
        try {
          const perm = await PushNotifications.checkPermissions();
          if (perm.receive !== "granted") {
            const request = await PushNotifications.requestPermissions();
            if (request.receive !== "granted") return;
          }
          await PushNotifications.register();
        } catch (err) {
          console.warn("Push registration failed", err);
        }
      }

      PushNotifications.addListener("registration", async (token) => {
        try {
          await supabase
            .from("device_tokens" as any)
            .upsert({
              user_id: user.id,
              token: token.value,
              platform: Capacitor.getPlatform(),
              last_seen_at: new Date().toISOString(),
            }, { onConflict: "token" });
        } catch (err) {
          console.warn("Failed to save push token", err);
        }
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
        const data = (notification?.notification as any)?.data || {};
        const linkPath = data.link_path || "/academy/community";
        if (linkPath) {
          window.location.href = linkPath;
        }
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        const data = (notification as any)?.data || {};
        if (data?.type === "live_now") {
          void hapticStrong();
        }
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.warn("Push registration error", err);
      });

      registerPush();
    }).catch(() => {
      console.warn("@capacitor/push-notifications not available");
    });
  }, [user]);
}
