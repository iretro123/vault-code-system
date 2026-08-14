import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  LEGACY_PRICE_MAP,
  VAULT_OS_PLAN,
  vaultOsMonthlyPriceId,
} from "../_shared/vaultAccess.ts";

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

    // The current $99/mo Vault OS Full Access price. No legacy fallback.
    const defaultPriceId = vaultOsMonthlyPriceId();

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
    const requestedPriceId: string | null = body.price_id || defaultPriceId;

    if (!requestedPriceId) {
      logStep("MISSING_PRICE_SECRET");
      return new Response(
        JSON.stringify({
          error:
            "Checkout is not configured: STRIPE_VAULT_OS_MONTHLY_PRICE_ID is not set. Add the Vault OS Full Access $99/month price ID in Project Settings → Secrets.",
          code: "missing_price_config",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Resolve plan: current Vault OS price, or a legacy price for legacy customers.
    const plan =
      requestedPriceId === defaultPriceId
        ? VAULT_OS_PLAN
        : LEGACY_PRICE_MAP[requestedPriceId] ?? null;

    if (!plan) {
      throw new Error(`Invalid price_id: ${requestedPriceId}. Not an approved Vault OS price.`);
    }

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

    const origin = req.headers.get("origin") || "https://member.vaulttradingacademy.com";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user?.email || undefined,
      line_items: [{ price: requestedPriceId, quantity: 1 }],
      mode: "subscription",
      metadata,
      success_url: `${origin}/academy?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/membership?checkout=canceled`,
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
