import type { User } from "@supabase/supabase-js";

export const VAULT_OS_MONTHLY_PRODUCT_ID = "com.vaulttradingacademy.vaultos.fullaccess.monthly99v2";
export const VAULT_OS_MONTHLY_FALLBACK_PRICE = "$99/month";
export const SHARED_GUEST_EMAIL = "guest@vaulttradingacademy.com";
export const FULL_ACCESS_ROLE = "vault_access";
export const VAULT_OS_SITE_URL = "https://member.vaulttradingacademy.com";
export const VAULT_OS_PRIVACY_POLICY_PATH = "/privacy-policy";
export const VAULT_OS_TERMS_PATH = "/terms-of-use";
export const VAULT_OS_PRIVACY_POLICY_URL = `${VAULT_OS_SITE_URL}${VAULT_OS_PRIVACY_POLICY_PATH}`;
export const VAULT_OS_TERMS_URL = `${VAULT_OS_SITE_URL}${VAULT_OS_TERMS_PATH}`;
export const GUEST_UPGRADE_BANNER_DISMISSED_KEY = "va_guest_upgrade_banner_dismissed";

function resolveAppUrl(path: string) {
  return `${VAULT_OS_SITE_URL}${path}`;
}

export function getVaultOsPrivacyPolicyUrl() {
  return resolveAppUrl(VAULT_OS_PRIVACY_POLICY_PATH);
}

export function getVaultOsTermsUrl() {
  return resolveAppUrl(VAULT_OS_TERMS_PATH);
}

type ProfileLike = {
  email?: string | null;
} | null | undefined;

export function isSharedGuestAccount(user: User | null | undefined, profile?: ProfileLike) {
  const resolvedEmail = (profile?.email ?? user?.email ?? "").trim().toLowerCase();
  return user?.user_metadata?.is_shared_guest === true || resolvedEmail === SHARED_GUEST_EMAIL;
}

export function clearMembershipUiState() {
  try {
    localStorage.removeItem(GUEST_UPGRADE_BANNER_DISMISSED_KEY);
    sessionStorage.removeItem("va_guest_mode");
  } catch {
    void 0;
  }
  window.dispatchEvent(new Event("guest-mode-changed"));
}
