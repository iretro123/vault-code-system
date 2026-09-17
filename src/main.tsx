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
  let baselineViewportHeight = viewport?.height ?? window.innerHeight;
  let baselineViewportWidth = viewport?.width ?? window.innerWidth;
  // Native keyboard height reported by Capacitor, normalised to CSS pixels.
  let nativeKeyboardHeight = 0;

  const toCssPixels = (rawHeight: number) => {
    if (!Number.isFinite(rawHeight) || rawHeight <= 0) return 0;
    const ratio = window.devicePixelRatio || 1;
    // Android reports device pixels; a value taller than the viewport itself
    // can only be device pixels, so scale it down before using it.
    if (ratio > 1 && rawHeight > baselineViewportHeight * 0.9) {
      return rawHeight / ratio;
    }
    return rawHeight;
  };

  const applyViewportLayout = () => {
    // Android edge-to-edge can leave the visual viewport unchanged while the
    // IME covers the composer, so fall back to the native keyboard height.
    // Do not reflow on pinch zoom.
    if (viewport?.scale && viewport.scale !== 1) return;

    const currentHeight = viewport?.height ?? window.innerHeight;
    const currentWidth = viewport?.width ?? window.innerWidth;

    if (Math.abs(currentWidth - baselineViewportWidth) > 80) {
      // Rotation, not a keyboard: rebase and drop keyboard state.
      baselineViewportWidth = currentWidth;
      baselineViewportHeight = currentHeight;
      nativeKeyboardHeight = 0;
      document.documentElement.style.setProperty("--academy-visible-height", `${currentHeight}px`);
      setKeyboardOpenState(false);
      return;
    }

    if (currentHeight > baselineViewportHeight) {
      baselineViewportHeight = currentHeight;
    }

    const viewportShrink = Math.max(0, baselineViewportHeight - currentHeight);
    // Never subtract twice: only the part the viewport did not already absorb.
    const residual = Math.max(0, nativeKeyboardHeight - viewportShrink);
    const visibleHeight = Math.max(200, currentHeight - residual);
    document.documentElement.style.setProperty("--academy-visible-height", `${visibleHeight}px`);

    const effectiveKeyboard = Math.max(viewportShrink, nativeKeyboardHeight);
    const editing = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
    const keyboardOpen =
      effectiveKeyboard > 120 && (nativeKeyboardHeight > 120 || !!editing);

    if (keyboardOpen) {
      setKeyboardOpenState(true, effectiveKeyboard);
    } else {
      if (nativeKeyboardHeight === 0) baselineViewportHeight = currentHeight;
      setKeyboardOpenState(false);
    }
  };

  if (viewport) {
    viewport.addEventListener("resize", applyViewportLayout);
  } else {
    window.addEventListener("resize", applyViewportLayout);
  }
  applyViewportLayout();

  import("@capacitor/keyboard")
    .then(({ Keyboard, KeyboardResize }) => {
      Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
      Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});

      const onShow = ({ keyboardHeight }: { keyboardHeight: number }) => {
        nativeKeyboardHeight = toCssPixels(keyboardHeight);
        applyViewportLayout();
      };
      const onHide = () => {
        nativeKeyboardHeight = 0;
        applyViewportLayout();
      };

      Keyboard.addListener("keyboardWillShow", onShow).catch(() => {});
      Keyboard.addListener("keyboardDidShow", onShow).catch(() => {});
      Keyboard.addListener("keyboardWillHide", onHide).catch(() => {});
      Keyboard.addListener("keyboardDidHide", onHide).catch(() => {});
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
