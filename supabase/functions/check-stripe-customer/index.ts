import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --- 1. Check Stripe ---
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripeUrl = `https://api.stripe.com/v1/customers?email=${encodeURIComponent(normalizedEmail)}&limit=1`;
      const stripeRes = await fetch(stripeUrl, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });

      if (stripeRes.ok) {
        const stripeData = await stripeRes.json();
        if (stripeData.data && stripeData.data.length > 0) {
          console.log("[check-membership] Found in Stripe:", normalizedEmail);
          return new Response(
            JSON.stringify({ found: true, source: "stripe" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error("[check-membership] Stripe API error:", stripeRes.status);
      }
    } else {
      console.warn("[check-membership] STRIPE_SECRET_KEY not set, skipping Stripe check");
    }

    // --- 2. Fallback: Check Whop ---
    const whopKey = Deno.env.get("WHOP_API_KEY");
    if (whopKey) {
      try {
        const whopUrl = `https://api.whop.com/api/v2/memberships?email=${encodeURIComponent(normalizedEmail)}`;
        const whopRes = await fetch(whopUrl, {
          headers: { Authorization: `Bearer ${whopKey}` },
        });

        if (whopRes.ok) {
          const whopData = await whopRes.json();
          const memberships = whopData.data ?? whopData.pagination?.data ?? [];
          if (Array.isArray(memberships) && memberships.length > 0) {
            console.log("[check-membership] Found in Whop:", normalizedEmail);
            return new Response(
              JSON.stringify({ found: true, source: "whop" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          const text = await whopRes.text();
          console.error("[check-membership] Whop API error:", whopRes.status, text);
        }
      } catch (whopErr) {
        console.error("[check-membership] Whop fetch error:", whopErr);
      }
    } else {
      console.warn("[check-membership] WHOP_API_KEY not set, skipping Whop check");
    }

    // --- 3. Not found anywhere ---
    console.log("[check-membership] Not found in Stripe or Whop:", normalizedEmail);
    return new Response(
      JSON.stringify({ found: false, source: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[check-membership] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
