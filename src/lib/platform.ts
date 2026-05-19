import { Capacitor } from "@capacitor/core";

export function isNativeCapacitorApp() {
  return (
    Capacitor.isNativePlatform() ||
    window.location.protocol === "capacitor:" ||
    window.navigator.userAgent.includes("Capacitor")
  );
}

export function isNativeIOSApp() {
  return isNativeCapacitorApp() && Capacitor.getPlatform() === "ios";
}
