import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FULL_ACCESS_ROLE = "vault_access";
const SHARED_GUEST_EMAIL = "guest@vaulttradingacademy.com";
const DEFAULT_PACKAGE_NAME = "com.vaulttradingacademy.vaultos";
const DEFAULT_PRODUCT_ID = "com.vaulttradingacademy.vaultos.fullaccess.monthly99v2";
const GOOGLE_PLAY_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const ACTIVE_SUBSCRIPTION_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
]);

type GoogleSubscriptionV2 = {
  kind?: string;
  regionCode?: string;
  subscriptionState?: string;
  latestOrderId?: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  startTime?: string;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: {
      autoRenewEnabled?: boolean;
    };
    offerDetails?: Record<string, unknown>;
  }>;
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

async function getGoogleAccessToken() {
  const clientEmail = requiredEnv("GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL");
  const privateKey = requiredEnv("GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(privateKey, "RS256");
  const assertion = await new SignJWT({
    scope: GOOGLE_PLAY_SCOPE,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`GOOGLE_OAUTH_FAILED:${payload.error_description ?? payload.error ?? response.status}`);
  }

  return payload.access_token as string;
}

async function verifyGooglePlaySubscription(packageName: string, purchaseToken: string) {
  const accessToken = await getGoogleAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`GOOGLE_PLAY_PURCHASE_VERIFY_FAILED:${payload?.error?.message ?? response.status}`);
  }
  return payload as GoogleSubscriptionV2;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = requiredEnv("SUPABASE_ANON_KEY");

    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) throw new Error("AUTH_MISSING_HEADER");
    if (!authHeader.startsWith("Bearer ")) throw new Error("AUTH_INVALID_SCHEME");
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const claims = claimsData?.claims as Record<string, unknown> | undefined;
    const callerId = claims?.sub as string | undefined;
    if (claimsError) throw new Error(`AUTH_CLAIMS_ERROR:${claimsError.message}`);
    if (!callerId) throw new Error("AUTH_NO_SUB");

    const callerEmail = typeof claims?.email === "string" ? claims.email.toLowerCase() : "";
    const callerMetadata = claims?.user_metadata && typeof claims.user_metadata === "object"
      ? claims.user_metadata as Record<string, unknown>
      : {};
    if (callerMetadata.is_shared_guest === true || callerEmail === SHARED_GUEST_EMAIL) {
      throw new Error("Guest preview accounts must create a personal account before upgrading");
    }

    const {
      productId,
      purchaseToken,
      orderId,
      packageName,
      purchaseDate,
      isAcknowledged,
    } = await req.json();

    if (!productId || typeof productId !== "string") throw new Error("PRODUCT_ID_REQUIRED");
    if (!purchaseToken || typeof purchaseToken !== "string") throw new Error("PURCHASE_TOKEN_REQUIRED");

    const expectedProductId = Deno.env.get("GOOGLE_PLAY_MONTHLY_PRODUCT_ID")
      ?? Deno.env.get("VAULT_OS_MONTHLY_PRODUCT_ID")
      ?? DEFAULT_PRODUCT_ID;
    const expectedPackageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? DEFAULT_PACKAGE_NAME;
    const submittedPackageName = typeof packageName === "string" && packageName ? packageName : expectedPackageName;

    if (productId !== expectedProductId) {
      throw new Error("Google Play product does not match Vault OS membership");
    }
    if (submittedPackageName !== expectedPackageName) {
      throw new Error("Google Play package name does not match Vault OS");
    }

    const verified = await verifyGooglePlaySubscription(expectedPackageName, purchaseToken);
    const matchingLineItem = verified.lineItems?.find((item) => item.productId === expectedProductId);
    if (!matchingLineItem) {
      throw new Error("Google Play subscription item does not match Vault OS membership");
    }

    const subscriptionState = verified.subscriptionState ?? "UNKNOWN";
    if (!ACTIVE_SUBSCRIPTION_STATES.has(subscriptionState)) {
      throw new Error(`Google Play subscription is not active:${subscriptionState}`);
    }

    const expiresDate = matchingLineItem.expiryTime ?? null;
    if (expiresDate && new Date(expiresDate).getTime() <= Date.now()) {
      throw new Error("Google Play subscription is expired");
    }

    const verifiedOrderId = verified.latestOrderId ?? orderId ?? null;
    const verifiedPurchaseDate = verified.startTime ?? purchaseDate ?? new Date().toISOString();
    const acknowledgementState = verified.acknowledgementState ?? (isAcknowledged ? "ACKNOWLEDGED_CLIENT" : "UNKNOWN");

    const metadata = {
      received_via: "google_play_billing",
      google_verified: true,
      region_code: verified.regionCode ?? null,
      linked_purchase_token: verified.linkedPurchaseToken ?? null,
      auto_renew_enabled: matchingLineItem.autoRenewingPlan?.autoRenewEnabled ?? null,
      offer_details: matchingLineItem.offerDetails ?? null,
    };

    const { error: activationError } = await admin
      .from("android_membership_activations")
      .upsert(
        {
          user_id: callerId,
          product_id: expectedProductId,
          purchase_token: purchaseToken,
          order_id: verifiedOrderId,
          package_name: expectedPackageName,
          purchase_date: verifiedPurchaseDate,
          expires_date: expiresDate,
          acknowledgement_state: acknowledgementState,
          subscription_state: subscriptionState,
          metadata,
        },
        { onConflict: "purchase_token" },
      );
    if (activationError) throw activationError;

    const { error: deleteBasicError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", callerId)
      .in("role", ["basic_tier", "free"]);
    if (deleteBasicError) throw deleteBasicError;

    const { error: fullRoleError } = await admin
      .from("user_roles")
      .upsert(
        {
          user_id: callerId,
          role: FULL_ACCESS_ROLE,
          subscription_status: "active",
          subscription_started_at: verifiedPurchaseDate,
          subscription_expires_at: expiresDate,
        },
        { onConflict: "user_id,role" },
      );
    if (fullRoleError) throw fullRoleError;

    await admin
      .from("profiles")
      .update({ access_status: "active", updated_at: new Date().toISOString() })
      .eq("user_id", callerId);

    return new Response(
      JSON.stringify({
        ok: true,
        role: FULL_ACCESS_ROLE,
        subscriptionState,
        expiresDate,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
