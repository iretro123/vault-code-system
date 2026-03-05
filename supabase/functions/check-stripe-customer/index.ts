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
            JSON.stringify({ found: true, status: "active" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error("[check-membership] Stripe API error:", stripeRes.status);
      }
    } else {
      console.warn("[check-membership] STRIPE_SECRET_KEY not set, skipping Stripe check");
    }

    // --- 2. Fallback: Check Whop (paginated, server-side email match) ---
    const whopKey = Deno.env.get("WHOP_API_KEY");
    if (whopKey) {
      try {
        const MAX_PAGES = 10; // 50 per page × 10 = 500 max
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= MAX_PAGES) {
          const whopUrl = `https://api.whop.com/api/v2/memberships?per=50&page=${page}`;
          const whopRes = await fetch(whopUrl, {
            headers: { Authorization: `Bearer ${whopKey}` },
          });

          if (!whopRes.ok) {
            const text = await whopRes.text();
            console.error("[check-membership] Whop API error:", whopRes.status, text);
            break;
          }

          const whopData = await whopRes.json();
          const memberships = whopData.data ?? whopData.pagination?.data ?? [];

          if (!Array.isArray(memberships) || memberships.length === 0) {
            break;
          }

          // Server-side email match
          for (const m of memberships) {
            const mEmail = (m.email ?? "").trim().toLowerCase();
            const mUserEmail = (m.user?.email ?? "").trim().toLowerCase();

            if (mEmail === normalizedEmail || mUserEmail === normalizedEmail) {
              // Found a match — check status
              const isActive = m.valid === true && ["active", "trialing", "completed"].includes(m.status);
              const status = isActive ? "active" : "canceled";
              console.log(`[check-membership] Whop match: ${normalizedEmail} → ${status} (valid=${m.valid}, status=${m.status})`);
              return new Response(
                JSON.stringify({ found: true, status }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }

          // Check if there are more pages
          const pagination = whopData.pagination;
          if (pagination && pagination.current_page < pagination.last_page) {
            page++;
          } else if (memberships.length < 50) {
            hasMore = false;
          } else {
            page++;
          }
        }

        console.log("[check-membership] No Whop match after scanning", (page - 1) * 50, "memberships for:", normalizedEmail);
      } catch (whopErr) {
        console.error("[check-membership] Whop fetch error:", whopErr);
      }
    } else {
      console.warn("[check-membership] WHOP_API_KEY not set, skipping Whop check");
    }

    // --- 3. Not found anywhere ---
    console.log("[check-membership] Not found:", normalizedEmail);
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
