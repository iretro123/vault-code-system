import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FULL_ACCESS_ROLE = "vault_os_owner";
const SHARED_GUEST_EMAIL = "guest@vaulttradingacademy.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { persistSession: false },
        global: { headers: { authorization: authHeader } },
      },
    );

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const callerId = claimsData?.claims?.sub as string | undefined;
    if (claimsError || !callerId) throw new Error("Unauthorized");

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(callerId);
    const user = userData?.user;
    if (userError || !user) throw new Error("Unauthorized");

    if (user.user_metadata?.is_shared_guest === true || user.email?.toLowerCase() === SHARED_GUEST_EMAIL) {
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
    } = await req.json();

    if (!productId || !transactionId || !originalTransactionId || !purchaseDate) {
      throw new Error("Missing required membership transaction fields");
    }

    if (appAccountToken && appAccountToken !== user.id) {
      throw new Error("Purchase token does not match the signed-in account");
    }

    const metadata = {
      received_via: "ios_storekit",
      latest_purchase_date: purchaseDate,
      latest_expiration_date: expirationDate ?? null,
    };

    const { error: activationError } = await admin
      .from("ios_membership_activations")
      .upsert(
        {
          user_id: user.id,
          product_id: productId,
          transaction_id: transactionId,
          original_transaction_id: originalTransactionId,
          purchase_date: purchaseDate,
          expires_date: expirationDate ?? null,
          environment: environment ?? null,
          ownership_type: ownershipType ?? null,
          app_account_token: appAccountToken ?? null,
          metadata,
        },
        { onConflict: "transaction_id" },
      );
    if (activationError) throw activationError;

    const { error: deleteBasicError } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", user.id)
      .eq("role", "basic_tier");
    if (deleteBasicError) throw deleteBasicError;

    const { error: fullRoleError } = await admin
      .from("user_roles")
      .upsert(
        {
          user_id: user.id,
          role: FULL_ACCESS_ROLE,
          subscription_status: "active",
          subscription_started_at: purchaseDate,
          subscription_expires_at: expirationDate ?? null,
        },
        { onConflict: "user_id,role" },
      );
    if (fullRoleError) throw fullRoleError;

    await admin
      .from("profiles")
      .update({ access_status: "active" })
      .eq("user_id", user.id);

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
