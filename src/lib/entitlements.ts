/**
 * Single source of truth for what a member can see.
 *
 * DENY BY DEFAULT: a role only unlocks the full app if it is explicitly
 * listed in FULL_ACCESS_ROLES. Anything else (including the legacy `free`
 * role, an unknown role, or a missing role row) is treated as Free Basic.
 *
 * This is deliberate. The old model gated only `basic_tier`, which meant any
 * new/legacy/unrecognised role silently received Signals, Live and every
 * chapter. Adding a role must now be an intentional decision.
 *
 * Free Basic sees:  Community (chat / wins / calendar), Beginner Bridge, Settings
 * Full access sees: everything, including Signals and Live calls
 */
export type AppRole =
  | "free"
  | "basic_tier"
  | "vault_access"
  | "vault_intelligence"
  | "vault_os_owner"
  | "operator";

/** Roles that unlock the complete Vault OS app. Nothing else does. */
export const FULL_ACCESS_ROLES = [
  "vault_access", // paying member (Stripe/Whop/Apple) or whitelisted manual grant
  "vault_intelligence", // paying member, higher tier
  "vault_os_owner", // staff
  "operator", // staff
] as const satisfies readonly AppRole[];

const FULL_ACCESS = new Set<string>(FULL_ACCESS_ROLES);

/** True only for roles explicitly granted the full app. */
export function hasFullAccess(role: string | null | undefined): boolean {
  return !!role && FULL_ACCESS.has(role);
}

/** True for Free Basic members — i.e. anyone without an explicit full-access role. */
export function isFreeBasic(role: string | null | undefined): boolean {
  return !hasFullAccess(role);
}

/** Routes a Free Basic member is allowed to reach. */
export function isFreeBasicAllowedPath(pathname: string): boolean {
  return (
    pathname === "/academy/learn" ||
    pathname.startsWith("/academy/learn/") ||
    pathname === "/academy/bootcamp" ||
    pathname.startsWith("/academy/bootcamp") ||
    pathname === "/academy/community" ||
    pathname.startsWith("/academy/community") ||
    pathname === "/academy/settings" ||
    pathname.startsWith("/academy/settings") ||
    pathname === "/academy/profile"
  );
}

/** Human label for the access source recorded on user_roles.access_source. */
export const ACCESS_SOURCE_LABELS: Record<string, string> = {
  stripe: "Paid (Stripe)",
  whop: "Paid (Whop)",
  apple: "Paid (Apple)",
  whitelist: "Whitelisted",
  manual: "Manual grant",
  owner: "Staff",
  free: "Free Basic",
};
