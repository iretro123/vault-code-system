import type { User } from "@supabase/supabase-js";

export const VAULT_OS_MONTHLY_PRODUCT_ID = "com.vaulttradingacademy.vaultos.fullaccess.monthly99v2";
export const VAULT_OS_MONTHLY_FALLBACK_PRICE = "$99/month";
export const SHARED_GUEST_EMAIL = "guest@vaulttradingacademy.com";
export const FULL_ACCESS_ROLE = "vault_os_owner";
export const VAULT_OS_PRIVACY_POLICY_PATH = "/privacy-policy";
export const VAULT_OS_TERMS_PATH = "/terms-of-use";

function buildLegalUrl(path: string) {
  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).toString();
  }
  return `https://member.vaulttradingacademy.com${path}`;
}

export function getVaultOsPrivacyPolicyUrl() {
  return buildLegalUrl(VAULT_OS_PRIVACY_POLICY_PATH);
}

export function getVaultOsTermsUrl() {
  return buildLegalUrl(VAULT_OS_TERMS_PATH);
}

type ProfileLike = {
  email?: string | null;
} | null | undefined;

export function isSharedGuestAccount(user: User | null | undefined, profile?: ProfileLike) {
  const resolvedEmail = (profile?.email ?? user?.email ?? "").trim().toLowerCase();
  return user?.user_metadata?.is_shared_guest === true || resolvedEmail === SHARED_GUEST_EMAIL;
}
