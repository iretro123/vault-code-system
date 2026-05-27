/**
 * Lightweight guest-mode helpers. Guest mode is a client-only flag stored in
 * sessionStorage — guests are not authenticated, hold no Supabase session, and
 * cannot write to the backend. Anything they "try" to do (chat, post, react)
 * must be blocked at the UI layer.
 */
const KEY = "va_guest_mode";

export function enableGuestMode() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    void 0;
  }
}

export function disableGuestMode() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    void 0;
  }
}

export function isGuestMode(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
