// Polyfill URL.parse for older browsers (Safari <17, older iOS/Android)
const urlWithParse = URL as typeof URL & {
  parse?: (url: string, base?: string) => URL | null;
};

if (typeof urlWithParse.parse !== "function") {
  urlWithParse.parse = (url: string, base?: string) => {
    try { return new URL(url, base); }
    catch { return null; }
  };
}

import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { hydrateNativeAuthPersistence } from "./lib/nativeAuthPersistence";
import { installMembershipReconciler } from "./lib/membershipReconciler";
import "./index.css";


const isNativeCapacitor =
  Capacitor.isNativePlatform() ||
  window.location.protocol === "capacitor:" ||
  window.navigator.userAgent.includes("Capacitor");

if (isNativeCapacitor) {
  document.documentElement.classList.add("native-capacitor");
  document.body.classList.add("native-capacitor");

  document
    .querySelectorAll<HTMLLinkElement>('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]')
    .forEach((link) => link.remove());

  // The root clips page overflow; nested tabs and carousels must retain touch scrolling.

  const setKeyboardOpenState = (isOpen: boolean, keyboardHeight = 0) => {
    document.body.classList.toggle("native-keyboard-open", isOpen);
    document.documentElement.classList.toggle("native-keyboard-open", isOpen);

    if (isOpen && keyboardHeight > 0) {
      document.body.style.setProperty("--academy-keyboard-height", `${keyboardHeight}px`);
    } else {
      document.body.style.removeProperty("--academy-keyboard-height");
    }
  };

  const viewport = window.visualViewport;
  if (viewport) {
    let baselineViewportHeight = viewport.height;
    let baselineViewportWidth = viewport.width;

    const syncKeyboardFromViewport = () => {
      // Android edge-to-edge can leave 100dvh unchanged while the IME covers it.
      // Size the app to the visible viewport, but do not reflow on pinch zoom.
      if (viewport.scale && viewport.scale !== 1) return;
      const currentHeight = viewport.height;
      document.documentElement.style.setProperty("--academy-visible-height", `${currentHeight}px`);
      if (Math.abs(viewport.width - baselineViewportWidth) > 80) {
        baselineViewportWidth = viewport.width;
        baselineViewportHeight = currentHeight;
        setKeyboardOpenState(false);
        return;
      }
      if (currentHeight > baselineViewportHeight) {
        baselineViewportHeight = currentHeight;
      }

      const keyboardHeight = Math.max(0, baselineViewportHeight - currentHeight);
      const editing = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
      if (editing && keyboardHeight > 120) {
        setKeyboardOpenState(true, keyboardHeight);
      } else {
        baselineViewportHeight = currentHeight;
        setKeyboardOpenState(false);
      }
    };

    viewport.addEventListener("resize", syncKeyboardFromViewport);
    syncKeyboardFromViewport();
  }

  import("@capacitor/keyboard")
    .then(({ Keyboard, KeyboardResize }) => {
      Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
      Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});

      Keyboard.addListener("keyboardWillShow", ({ keyboardHeight }) => {
        setKeyboardOpenState(true, keyboardHeight);
      }).catch(() => {});

      Keyboard.addListener("keyboardDidShow", ({ keyboardHeight }) => {
        setKeyboardOpenState(true, keyboardHeight);
      }).catch(() => {});

      Keyboard.addListener("keyboardWillHide", () => {
        setKeyboardOpenState(false);
      }).catch(() => {});

      Keyboard.addListener("keyboardDidHide", () => {
        setKeyboardOpenState(false);
      }).catch(() => {});
    })
    .catch(() => {});
}

async function bootstrap() {
  // Hydrate native (Capacitor) auth storage from Preferences BEFORE the
  // Supabase client is created via the App import chain. On web this is a no-op.
  await hydrateNativeAuthPersistence();
  // Attach the StoreKit → Supabase entitlement reconciler as early as
  // possible so any Transaction.updates event emitted at launch (e.g. an
  // interrupted purchase, an Ask-to-Buy approval, a cross-device
  // subscription) is captured before the UI renders the paywall.
  installMembershipReconciler();
  const { default: App } = await import("./App.tsx");
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

bootstrap();
