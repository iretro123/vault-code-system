import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Buffer } from "node:buffer";
import {
  Environment,
  SignedDataVerifier,
  VerificationException,
} from "npm:@apple/app-store-server-library@3.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FULL_ACCESS_ROLE = "vault_os_owner";
const SHARED_GUEST_EMAIL = "guest@vaulttradingacademy.com";
const DEFAULT_BUNDLE_ID = "com.vaulttradingacademy.vaultos";
const DEFAULT_PRODUCT_ID = "com.vaulttradingacademy.vaultos.fullaccess.monthly99v2";
const DEFAULT_APP_APPLE_ID = 6770046448;
const APPLE_ROOT_CERT_URLS = [
  "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA-G2.cer",
  "https://www.apple.com/certificateauthority/AppleRootCA.cer",
];

let cachedAppleRootCertificates: Buffer[] | null = null;

function decodeJwtPayload(jwt: string) {
  const payload = jwt.split(".")[1];
  if (!payload) throw new Error("APPLE_TRANSACTION_JWS_INVALID");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

async function getAppleRootCertificates() {
  if (cachedAppleRootCertificates) return cachedAppleRootCertificates;

  const certificates = await Promise.all(
    APPLE_ROOT_CERT_URLS.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`APPLE_ROOT_CERT_FETCH_FAILED:${url}:${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    }),
  );

  cachedAppleRootCertificates = certificates;
  return certificates;
}

function resolveEnvironment(value: unknown) {
  if (value === Environment.SANDBOX || value === "Sandbox") return Environment.SANDBOX;
  if (value === Environment.PRODUCTION || value === "Production") return Environment.PRODUCTION;
  if (value === Environment.XCODE || value === "Xcode") return Environment.XCODE;
  throw new Error(`APPLE_TRANSACTION_ENVIRONMENT_UNSUPPORTED:${String(value)}`);
}

async function verifyAppleTransaction(signedTransactionInfo: string) {
  const decodedPreview = decodeJwtPayload(signedTransactionInfo);
  const environment = resolveEnvironment(decodedPreview.environment);
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID") ?? DEFAULT_BUNDLE_ID;
  const appAppleIdRaw = Deno.env.get("APPLE_APP_APPLE_ID") ?? Deno.env.get("APP_APPLE_ID");
  const appAppleId = appAppleIdRaw ? Number(appAppleIdRaw) : DEFAULT_APP_APPLE_ID;

  if (environment === Environment.PRODUCTION && !appAppleId) {
    throw new Error("APPLE_APP_APPLE_ID_REQUIRED_FOR_PRODUCTION_VERIFICATION");
  }

  const verifier = new SignedDataVerifier(
    await getAppleRootCertificates(),
    true,
    environment,
    bundleId,
    appAppleId,
  );

  try {
    return await verifier.verifyAndDecodeTransaction(signedTransactionInfo);
  } catch (error) {
    if (error instanceof VerificationException) {
      throw new Error(`APPLE_TRANSACTION_VERIFICATION_FAILED:${error.status}`);
    }
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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
      transactionId,
      originalTransactionId,
      purchaseDate,
      expirationDate,
      environment,
      ownershipType,
      appAccountToken,
      signedTransactionInfo,
    } = await req.json();

    if (!signedTransactionInfo || typeof signedTransactionInfo !== "string") {
      throw new Error("Missing Apple signed transaction proof");
    }

    const verifiedTransaction = await verifyAppleTransaction(signedTransactionInfo);
    const expectedProductId = Deno.env.get("VAULT_OS_MONTHLY_PRODUCT_ID") ?? DEFAULT_PRODUCT_ID;
    const verifiedProductId = verifiedTransaction.productId;
    const verifiedTransactionId = verifiedTransaction.transactionId;
    const verifiedOriginalTransactionId = verifiedTransaction.originalTransactionId;
    const verifiedPurchaseDate = verifiedTransaction.purchaseDate
      ? new Date(verifiedTransaction.purchaseDate).toISOString()
      : null;
    const verifiedExpirationDate = verifiedTransaction.expiresDate
      ? new Date(verifiedTransaction.expiresDate).toISOString()
      : null;
    const verifiedAppAccountToken = verifiedTransaction.appAccountToken ?? null;
    const verifiedEnvironment = verifiedTransaction.environment ?? environment ?? null;
    const verifiedOwnershipType = verifiedTransaction.inAppOwnershipType ?? ownershipType ?? null;

    if (!verifiedProductId || !verifiedTransactionId || !verifiedOriginalTransactionId || !verifiedPurchaseDate) {
      throw new Error("Missing required membership transaction fields");
    }

    if (verifiedProductId !== expectedProductId) {
      throw new Error("Apple transaction product does not match Vault OS membership");
    }

    if (productId && productId !== verifiedProductId) {
      throw new Error("Submitted product does not match Apple transaction");
    }

    if (transactionId && transactionId !== verifiedTransactionId) {
      throw new Error("Submitted transaction does not match Apple transaction");
    }

    if (originalTransactionId && originalTransactionId !== verifiedOriginalTransactionId) {
      throw new Error("Submitted original transaction does not match Apple transaction");
    }

    if (verifiedTransaction.revocationDate) {
      throw new Error("Apple transaction has been revoked or refunded");
    }

    if (verifiedExpirationDate && new Date(verifiedExpirationDate).getTime() <= Date.now()) {
      throw new Error("Apple subscription is expired");
    }

    if (verifiedAppAccountToken && verifiedAppAccountToken.toLowerCase() !== callerId.toLowerCase()) {
      throw new Error("Purchase token does not match the signed-in account");
    }

    const metadata = {
      received_via: "ios_storekit",
      latest_purchase_date: verifiedPurchaseDate,
      latest_expiration_date: verifiedExpirationDate,
      apple_verified: true,
      apple_signed_date: verifiedTransaction.signedDate
        ? new Date(verifiedTransaction.signedDate).toISOString()
        : null,
      apple_transaction_reason: verifiedTransaction.transactionReason ?? null,
    };

    const { error: activationError } = await admin
      .from("ios_membership_activations")
      .upsert(
        {
          user_id: callerId,
          product_id: verifiedProductId,
          transaction_id: verifiedTransactionId,
          original_transaction_id: verifiedOriginalTransactionId,
          purchase_date: verifiedPurchaseDate,
          expires_date: verifiedExpirationDate,
          environment: verifiedEnvironment,
          ownership_type: verifiedOwnershipType,
          app_account_token: verifiedAppAccountToken ?? appAccountToken ?? null,
          metadata,
        },
        { onConflict: "transaction_id" },
      );
    if (activationError) throw activationError;

    const { error: deleteBasicError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", callerId)
      .eq("role", "basic_tier");
    if (deleteBasicError) throw deleteBasicError;

    const { error: fullRoleError } = await admin
      .from("user_roles")
      .upsert(
        {
          user_id: callerId,
          role: FULL_ACCESS_ROLE,
          subscription_status: "active",
          subscription_started_at: verifiedPurchaseDate,
          subscription_expires_at: verifiedExpirationDate,
        },
        { onConflict: "user_id,role" },
      );
    if (fullRoleError) throw fullRoleError;

    await admin
      .from("profiles")
      .update({ access_status: "active" })
      .eq("user_id", callerId);

    return new Response(
      JSON.stringify({
        ok: true,
        role: FULL_ACCESS_ROLE,
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
