import { isNativeCapacitorApp } from "@/lib/platform";

export const CANONICAL_MEMBER_ORIGIN = "https://member.vaulttradingacademy.com";

/**
 * Destination for links inside auth emails. Native apps load from a local
 * origin (capacitor://localhost / https://localhost) that an email client
 * cannot open, so they use the canonical member site; browsers keep their
 * own origin.
 */
export function authEmailRedirect(path: string): string {
  const origin = isNativeCapacitorApp() ? CANONICAL_MEMBER_ORIGIN : window.location.origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
