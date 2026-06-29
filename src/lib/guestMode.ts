/**
 * Lightweight guest-mode helpers. Guest mode is a client-only flag stored in
 * localStorage so entering guest mode survives an app restart while the shared
 * guest session is being established.
 */
const KEY = "va_guest_mode";

export function enableGuestMode() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    void 0;
  }
}

export function disableGuestMode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    void 0;
  }
}

export function isGuestMode(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
