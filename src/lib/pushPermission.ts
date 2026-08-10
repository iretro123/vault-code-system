import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

export type PushPermissionState = "unsupported" | "granted" | "denied" | "prompt";

export function isNativePushPlatform() {
  if (typeof window === "undefined") return false;
  const platform = Capacitor.getPlatform();
  const native =
    Capacitor.isNativePlatform() ||
    window.location?.protocol === "capacitor:" ||
    /Capacitor/i.test(navigator.userAgent);
  return native && (platform === "ios" || platform === "android");
}

/** Stable per-device platform key so one physical device never duplicates pushes. */
export async function getPlatformKey() {
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

export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (!isNativePushPlatform()) return "unsupported";
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === "granted") return "granted";
    if (perm.receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

/**
 * Ask the OS for permission (iOS + Android 13+) and register with APNs/FCM.
 * Only call this from an explicit user action — the OS grants one prompt only.
 */
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!isNativePushPlatform()) return "unsupported";
  try {
    const current = await PushNotifications.checkPermissions();
    if (current.receive === "granted") {
      await PushNotifications.register();
      return "granted";
    }
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== "granted") return result.receive === "denied" ? "denied" : "prompt";
    await PushNotifications.register();
    return "granted";
  } catch (err) {
    console.warn("Push permission request failed", err);
    return "denied";
  }
}

export async function registerTokenForCurrentUser(params: {
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
    .upsert(
      {
        user_id: userId,
        token,
        platform: platformKey,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );

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
