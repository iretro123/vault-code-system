// Polyfill URL.parse for older browsers (Safari <17, older iOS/Android)
if (typeof URL.parse !== "function") {
  (URL as any).parse = (url: string, base?: string) => {
    try { return new URL(url, base); }
    catch { return null; }
  };
}

import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";

const isNativeCapacitor =
  Capacitor.isNativePlatform() ||
  window.location.protocol === "capacitor:" ||
  window.navigator.userAgent.includes("Capacitor");

if (isNativeCapacitor) {
  document.documentElement.classList.add("native-capacitor");
  document.body.classList.add("native-capacitor");
  import("@capacitor/keyboard")
    .then(({ Keyboard }) => Keyboard.setAccessoryBarVisible({ isVisible: false }))
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
