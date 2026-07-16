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

  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;

    const deltaX = Math.abs(event.touches[0].clientX - touchStartX);
    const deltaY = Math.abs(event.touches[0].clientY - touchStartY);

    if (deltaX > deltaY && deltaX > 8) {
      event.preventDefault();
    }
  };

  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchmove", handleTouchMove, { passive: false });

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

    const syncKeyboardFromViewport = () => {
      const currentHeight = viewport.height;
      if (currentHeight > baselineViewportHeight) {
        baselineViewportHeight = currentHeight;
      }

      const keyboardHeight = Math.max(0, baselineViewportHeight - currentHeight);
      if (keyboardHeight > 120) {
        setKeyboardOpenState(true, keyboardHeight);
      } else {
        baselineViewportHeight = currentHeight;
        setKeyboardOpenState(false);
      }
    };

    viewport.addEventListener("resize", syncKeyboardFromViewport);
  }

  const _kbMod = "@capacitor/keyboard";
  import(/* @vite-ignore */ _kbMod)
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
  const { default: App } = await import("./App.tsx");
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

bootstrap();

