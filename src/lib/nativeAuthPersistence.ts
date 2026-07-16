/**
 * Native (Capacitor iOS/Android) auth persistence.
 *
 * WKWebView / Android WebView can evict localStorage under storage pressure or
 * long inactivity, which silently logs users out. This module mirrors the
 * Supabase auth-token entry (and a few small caches) into Capacitor Preferences
 * (native keychain / SharedPreferences), and hydrates them back into
 * localStorage BEFORE the Supabase client is created.
 *
 * Call `hydrateNativeAuthPersistence()` once during app bootstrap on native
 * platforms, and await it before importing/rendering anything that touches
 * the Supabase client.
 */

import { Capacitor } from "@capacitor/core";

const AUTH_KEY_PREFIX = "sb-";
const AUTH_KEY_SUFFIX = "-auth-token";
const EXTRA_KEYS = ["va_cache_profile", "va_cache_role"];

function isNative(): boolean {
  try {
    return (
      Capacitor.isNativePlatform() ||
      window.location.protocol === "capacitor:" ||
      window.navigator.userAgent.includes("Capacitor")
    );
  } catch {
    return false;
  }
}

function isMirroredKey(key: string): boolean {
  if (key.startsWith(AUTH_KEY_PREFIX) && key.endsWith(AUTH_KEY_SUFFIX)) return true;
  return EXTRA_KEYS.includes(key);
}

let installed = false;

export async function hydrateNativeAuthPersistence(): Promise<void> {
  if (installed) return;
  if (!isNative()) return;
  installed = true;

  let Preferences: typeof import("@capacitor/preferences").Preferences;
  try {
    ({ Preferences } = await import("@capacitor/preferences"));
  } catch {
    // Plugin not available (older shell) — fall back to plain localStorage.
    return;
  }

  // 1) Hydrate: copy any persisted values from Preferences into localStorage
  //    BEFORE the Supabase client reads it.
  try {
    const { keys } = await Preferences.keys();
    for (const key of keys) {
      if (!isMirroredKey(key)) continue;
      // Never overwrite a fresher value already in localStorage.
      if (localStorage.getItem(key) != null) continue;
      const { value } = await Preferences.get({ key });
      if (value != null) {
        try {
          localStorage.setItem(key, value);
        } catch {
          /* quota — ignore */
        }
      }
    }
  } catch {
    /* ignore hydration errors */
  }

  // 2) Mirror: patch localStorage so future writes to auth keys are also
  //    persisted into Preferences. Reads stay synchronous (from localStorage).
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && isMirroredKey(key)) {
      Preferences.set({ key, value }).catch(() => {});
    }
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
    originalRemoveItem.call(this, key);
    if (this === window.localStorage && isMirroredKey(key)) {
      Preferences.remove({ key }).catch(() => {});
    }
  };
}
