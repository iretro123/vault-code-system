import type { User } from "@supabase/supabase-js";

export const VAULT_OS_MONTHLY_PRODUCT_ID = "com.vaulttradingacademy.vaultos.fullaccess.monthly99v2";
export const VAULT_OS_MONTHLY_FALLBACK_PRICE = "$99/month";
export const SHARED_GUEST_EMAIL = "guest@vaulttradingacademy.com";
export const FULL_ACCESS_ROLE = "vault_os_owner";
export const VAULT_OS_PRIVACY_POLICY_URL = "https://member.vaulttradingacademy.com/privacy-policy";
export const VAULT_OS_TERMS_URL = "https://member.vaulttradingacademy.com/terms-of-use";

type ProfileLike = {
  email?: string | null;
} | null | undefined;

export function isSharedGuestAccount(user: User | null | undefined, profile?: ProfileLike) {
  const resolvedEmail = (profile?.email ?? user?.email ?? "").trim().toLowerCase();
  return user?.user_metadata?.is_shared_guest === true || resolvedEmail === SHARED_GUEST_EMAIL;
}
