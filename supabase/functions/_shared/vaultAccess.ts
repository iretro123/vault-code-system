// Shared Vault OS entitlement mapping + role sync helpers.
// Used by create-checkout, stripe-webhook, reconcile-access, sweep-stripe-access
// and provision-manual-access so web Stripe access always lands on the same
// role/profile state. Native iOS/Android IAP flows are untouched.

/* eslint-disable @typescript-eslint/no-explicit-any */

export const VAULT_OS_PRODUCT_KEY = "vault_os";
export const VAULT_OS_TIER = "full_access";
export const PAID_ROLE = "vault_access";
export const NON_PAID_ROLES = ["basic_tier", "free"];
export const STAFF_ROLES = ["vault_os_owner", "operator"];

export type Plan = { product_key: string; tier: string; billing_cycle: string; legacy?: boolean };

/**
 * Legacy Stripe prices — accepted ONLY for syncing existing customers and
 * historical webhook events. They are never used for new checkout sessions.
 */
export const LEGACY_PRICE_MAP: Record<string, Plan> = {
  "price_1SB2aaAMsd1FtcvL44ONekRC": { product_key: "vault_academy", tier: "elite_v1", billing_cycle: "monthly", legacy: true },
  "price_1SB2YsAMsd1FtcvLHfcvmDCr": { product_key: "vault_academy", tier: "elite_v1", billing_cycle: "monthly", legacy: true },
  "price_1SB2VTAMsd1FtcvLjvrGfpm6": { product_key: "vault_academy", tier: "elite_v1", billing_cycle: "monthly", legacy: true },
};

/** The current $99/mo Vault OS Full Access price, from Supabase secrets. */
export function vaultOsMonthlyPriceId(): string | null {
  const id = (Deno.env.get("STRIPE_VAULT_OS_MONTHLY_PRICE_ID") || "").trim();
  return id || null;
}

export const VAULT_OS_PLAN: Plan = {
  product_key: VAULT_OS_PRODUCT_KEY,
  tier: VAULT_OS_TIER,
  billing_cycle: "monthly",
};

/** Resolve any Stripe price id to an internal plan (new price first, then legacy). */
export function resolvePlanForPrice(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  const current = vaultOsMonthlyPriceId();
  if (current && priceId === current) return VAULT_OS_PLAN;
  return LEGACY_PRICE_MAP[priceId] ?? null;
}

export const ACTIVE_STATUSES = ["active"];

export function isActiveStatus(status: string | null | undefined) {
  return !!status && ACTIVE_STATUSES.includes(status);
}

async function isStaff(admin: any, authUserId: string) {
  const { data } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", authUserId)
    .in("role", STAFF_ROLES)
    .maybeSingle();
  return !!data?.id;
}

/**
 * Paid Stripe access → unlock every paid Vault OS area.
 * Removes basic_tier/free, upserts vault_access, marks profile active.
 */
export async function grantPaidRole(
  admin: any,
  authUserId: string | null | undefined,
  subscriptionStatus = "active",
) {
  if (!authUserId) return false;
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", authUserId)
    .eq("role", PAID_ROLE)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await admin
      .from("user_roles")
      .update({ subscription_status: subscriptionStatus, updated_at: now })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await admin
      .from("user_roles")
      .insert({ user_id: authUserId, role: PAID_ROLE, subscription_status: subscriptionStatus });
    if (error) throw error;
  }

  // Only remove the free role after the paid role has been persisted.
  const { error: freeRoleError } = await admin.from("user_roles").delete().eq("user_id", authUserId).in("role", NON_PAID_ROLES);
  if (freeRoleError) throw freeRoleError;

  const { error: profileError } = await admin
    .from("profiles")
    .update({ access_status: "active", updated_at: now })
    .eq("user_id", authUserId)
    .not("access_status", "in", "(banned,revoked)");
  if (profileError) throw profileError;

  console.log("[vaultAccess] granted_paid_role", JSON.stringify({ authUserId, subscriptionStatus }));
  return true;
}

/** Does another valid entitlement still justify paid access? */
export async function hasOtherValidEntitlement(
  admin: any,
  authUserId: string,
  studentId: string | null,
  email: string | null,
  excludeProductKey?: string | null,
): Promise<boolean> {
  // Called after the billing row is updated. The database checks the actual
  // whitelist and verified, unexpired native purchases, not cached role labels.
  const { data, error } = await admin.rpc("vault_access_for_user", { uid: authUserId });
  if (error) throw error;
  return data === true;
}

/**
 * Stripe access ended (canceled / unpaid / incomplete_expired / deleted).
 * Removes vault_access and marks the profile inactive unless another valid
 * entitlement exists. The account stays usable on the Free Basic tier.
 */
export async function revokePaidRole(
  admin: any,
  opts: {
    authUserId: string | null | undefined;
    studentId?: string | null;
    email?: string | null;
    excludeProductKey?: string | null;
  },
) {
  const authUserId = opts.authUserId;
  if (!authUserId) return false;

  if (await isStaff(admin, authUserId)) {
    console.log("[vaultAccess] revoke_skipped_staff", JSON.stringify({ authUserId }));
    return false;
  }

  const keep = await hasOtherValidEntitlement(
    admin,
    authUserId,
    opts.studentId ?? null,
    opts.email ?? null,
    opts.excludeProductKey ?? null,
  );
  if (keep) {
    console.log("[vaultAccess] revoke_skipped_other_entitlement", JSON.stringify({ authUserId }));
    return false;
  }

  const now = new Date().toISOString();
  await admin.from("user_roles").delete().eq("user_id", authUserId).eq("role", PAID_ROLE);

  const { data: basic } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", authUserId)
    .eq("role", "basic_tier")
    .maybeSingle();
  if (basic?.id) {
    await admin
      .from("user_roles")
      .update({ subscription_status: "none", updated_at: now })
      .eq("id", basic.id);
  } else {
    await admin
      .from("user_roles")
      .insert({ user_id: authUserId, role: "basic_tier", subscription_status: "none" });
  }

  await admin
    .from("profiles")
    .update({ access_status: "inactive", updated_at: now })
    .eq("user_id", authUserId)
    .not("access_status", "in", "(banned,revoked)");

  console.log("[vaultAccess] revoked_paid_role", JSON.stringify({ authUserId }));
  return true;
}

/** Sync role/profile state from an internal access status for one student row. */
export async function syncRolesFromStatus(
  admin: any,
  opts: {
    authUserId: string | null | undefined;
    studentId?: string | null;
    email?: string | null;
    status: string;
    productKey?: string | null;
  },
) {
  if (!opts.authUserId) return;
  if (isActiveStatus(opts.status)) {
    await grantPaidRole(admin, opts.authUserId, "active");
  } else {
    await revokePaidRole(admin, {
      authUserId: opts.authUserId,
      studentId: opts.studentId,
      email: opts.email,
      excludeProductKey: opts.productKey ?? null,
    });
  }
}
