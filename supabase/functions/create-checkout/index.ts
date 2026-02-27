import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// ─── Centralized Price Map (same as stripe-webhook) ───
const PRICE_MAP: Record<string, { product_key: string; tier: string; billing_cycle: string; label: string }> = {
  "price_1SB2aaAMsd1FtcvL44ONekRC": {
    product_key: "vault_academy",
    tier: "elite_v1",
    billing_cycle: "monthly",
    label: "Vault Academy Elite — Monthly",
  },
  "price_1SB2YsAMsd1FtcvLHfcvmDCr": {
    product_key: "vault_academy",
    tier: "elite_v1",
    billing_cycle: "monthly",
    label: "Vault Academy Elite — Monthly",
  },
  "price_1SB2VTAMsd1FtcvLjvrGfpm6": {
    product_key: "vault_academy",
    tier: "elite_v1",
    billing_cycle: "monthly",
    label: "Vault Academy Elite — Monthly",
  },
};

// Default price to use for checkout
const DEFAULT_PRICE_ID = "price_1SB2aaAMsd1FtcvL44ONekRC";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[create-checkout] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Authenticate user (optional — supports guest checkout)
    const authHeader = req.headers.get("Authorization");
    let user: { id: string; email?: string } | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
    }

    logStep("Auth resolved", { userId: user?.id, email: user?.email });

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const requestedPriceId = body.price_id || DEFAULT_PRICE_ID;

    // Validate price ID exists in our mapping
    if (!PRICE_MAP[requestedPriceId]) {
      throw new Error(`Invalid price_id: ${requestedPriceId}. Not in approved price map.`);
    }

    const plan = PRICE_MAP[requestedPriceId];
    logStep("Plan resolved", { priceId: requestedPriceId, plan });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    let customerId: string | undefined;
    if (user?.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing customer found", { customerId });
      }
    }

    // Build metadata for webhook provisioning
    const metadata: Record<string, string> = {
      app_product_key: plan.product_key,
      app_tier: plan.tier,
      app_price_id: requestedPriceId,
      source: "vault_checkout",
    };
    if (user?.id) metadata.internal_user_id = user.id;

    const origin = req.headers.get("origin") || "https://vault.academy";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user?.email || undefined,
      line_items: [{ price: requestedPriceId, quantity: 1 }],
      mode: "subscription",
      metadata,
      success_url: `${origin}/academy?checkout=success`,
      cancel_url: `${origin}/academy?checkout=canceled`,
      subscription_data: {
        metadata,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
