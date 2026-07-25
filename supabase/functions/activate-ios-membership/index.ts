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

const FULL_ACCESS_ROLE = "vault_access";
const SHARED_GUEST_EMAIL = "guest@vaulttradingacademy.com";
const DEFAULT_BUNDLE_ID = "com.vaulttradingacademy.vaultos";
const DEFAULT_PRODUCT_ID = "com.vaulttradingacademy.vaultos.fullaccess.monthly99v2";
const DEFAULT_APP_APPLE_ID = 6770046448;
// Apple Root CA certificates embedded as base64 DER. Bundling avoids relying
// on outbound fetches to apple.com from the edge runtime (which was returning
// 404 for the legacy AppleRootCA.cer URL and causing APPLE_ROOT_CERT_FETCH_FAILED).
// Source: https://www.apple.com/certificateauthority/
const APPLE_ROOT_CERT_B64: string[] = [
  // Apple Root CA - G3 (ECC) — used by StoreKit 2 signed transactions
  "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==",
  // Apple Root CA - G2 (RSA)
  "MIIFkjCCA3qgAwIBAgIIAeDltYNno+AwDQYJKoZIhvcNAQEMBQAwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEcyMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxMDA5WhcNMzkwNDMwMTgxMDA5WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzIxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBANgREkhI2imKScUcx+xuM23+TfvgHN6sXuI2pyT5f1BrTM65MFQn5bPW7SXmMLYFN14UIhHF6Kob0vuy0gmVOKTvKkmMXT5xZgM4+xb1hYjkWpIMBDLyyED7Ul+f9sDx47pFoFDVEovy3d6RhiPw9bZyLgHaC/YuOQhfGaFjQQscp5TBhsRTL3b2CtcM0YM/GlMZ81fVJ3/8E7j4ko380yhDPLVoACVdJ2LT3VXdRCCQgzWTxb+4Gftr49wIQuavbfqeQMpOhYV4SbHXw8EwOTKrfl+q04tvny0aIWhwZ7Oj8ZhBbZF8+NfbqOdfIRqMM78xdLe40fTgIvS/cjTf94FNcX1RoeKz8NMoFnNvzcytN31O661A4T+B/fc9Cj6i8b0xlilZ3MIZgIxbdMYs0xBTJh0UT8TUgWY8h2czJxQI6bR3hDRSj4n4aJgXv8O7qhOTH11UL6jHfPsNFL4VPSQ08prcdUFmIrQB1guvkJ4M6mL4m1k8COKWNORj3rw31OsMiANDC1CvoDTdUE0V+1ok2Az6DGOeHwOx4e7hqkP0ZmUoNwIx7wHHHtHMn23KVDpA287PT0aLSmWaasZobNfMmRtHsHLDd4/E92GcdB/O/WuhwpyUgquUoue9G7q5cDmVF8Up8zlYNPXEpMZ7YLlmQ1A/bmH8DvmGqmAMQ0uVAgMBAAGjQjBAMB0GA1UdDgQWBBTEmRNsGAPCe8CjoA1/coB6HHcmjTAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQwFAAOCAgEAUabz4vS4PZO/Lc4Pu1vhVRROTtHlznldgX/+tvCHM/jvlOV+3Gp5pxy+8JS3ptEwnMgNCnWefZKVfhidfsJxaXwU6s+DDuQUQp50DhDNqxq6EWGBeNjxtUVAeKuowM77fWM3aPbn+6/Gw0vsHzYmE1SGlHKy6gLti23kDKaQwFd1z4xCfVzmMX3zybKSaUYOiPjjLUKyOKimGY3xn83uamW8GrAlvacp/fQ+onVJv57byfenHmOZ4VxG/5IFjPoeIPmGlFYl5bRXOJ3riGQUIUkhOb9iZqmxospvPyFgxYnURTbImHy99v6ZSYA7LNKmp4gDBDEZt7Y6YUX6yfIjyGNzv1aJMbDZfGKnexWoiIqrOEDCzBL/FePwN983csvMmOa/orz6JopxVtfnJBtIRD6e/J/JzBrsQzwBvDR4yGn1xuZW7AYJNpDrFEobXsmII9oDMJELuDY++ee1KG++P+w8j2Ud5cAeh6Squpj9kuNsJnfdBrRkBof0Tta6SqoWqPQFZ2aWuuJVecMsXUmPgEkrihLHdoBR37q9ZV0+N0djMenl9MU/S60EinpxLK8JQzcPqOMyT/RFtm2XNuyE9QoB6he7hY1Ck3DDUOUUi78/w0EP3SIEIwiKum1xRKtzCTrJ+VKACd+66eYWyi4uTLLT3OUEVLLUNIAytbwPF+E=",
];

let cachedAppleRootCertificates: Buffer[] | null = null;

function decodeJwtPayload(jwt: string) {
  const payload = jwt.split(".")[1];
  if (!payload) throw new Error("APPLE_TRANSACTION_JWS_INVALID");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

function getAppleRootCertificates() {
  if (cachedAppleRootCertificates) return cachedAppleRootCertificates;
  cachedAppleRootCertificates = APPLE_ROOT_CERT_B64.map((b64) => Buffer.from(b64, "base64"));
  return cachedAppleRootCertificates;
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
