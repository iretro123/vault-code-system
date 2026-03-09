import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // --- 2. Check allowed_signups whitelist ---
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseServiceKey);

      const { data: allowedRow } = await sb
        .from("allowed_signups")
        .select("id, claimed, stripe_customer_id")
        .eq("email", normalizedEmail)
        .eq("claimed", false)
        .maybeSingle();

      if (allowedRow) {
        console.log("[check-membership] Found in allowed_signups whitelist:", normalizedEmail);
        return new Response(
          JSON.stringify({ found: true, status: "active" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (e) {
      console.error("[check-membership] allowed_signups check error:", e);
    }

    // --- 3. Fallback: Check Whop (paginate ALL active members) ---
    const whopKey = Deno.env.get("WHOP_API_KEY");
    if (whopKey) {
      try {
        let page = 1;
        let totalScanned = 0;
        const PER_PAGE = 100;

        while (true) {
          const whopUrl = `https://api.whop.com/api/v2/members?per=${PER_PAGE}&page=${page}`;
          const whopRes = await fetch(whopUrl, {
            headers: { Authorization: `Bearer ${whopKey}` },
          });

          if (!whopRes.ok) {
            console.error("[check-membership] Whop API error on page", page, ":", whopRes.status);
            break;
          }

          const whopData = await whopRes.json();
          const members = whopData.data ?? [];

          // Debug: log pagination structure on first page
          if (page === 1) {
            console.log("[check-membership] Whop pagination keys:", JSON.stringify(whopData.pagination ?? "none"));
          }

          if (!Array.isArray(members) || members.length === 0) {
            console.log(`[check-membership] Whop scan done. Pages: ${page}, Total: ${totalScanned}, no match: ${normalizedEmail}`);
            break;
          }

          totalScanned += members.length;

          for (const m of members) {
            const mEmail = (m.email ?? "").trim().toLowerCase();
            if (mEmail === normalizedEmail) {
              console.log(`[check-membership] Whop MATCH page ${page} (scanned ${totalScanned}):`, normalizedEmail);
              return new Response(
                JSON.stringify({ found: true, status: "active" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }

          // If we got fewer than PER_PAGE results, we've reached the last page
          if (members.length < PER_PAGE) {
            console.log(`[check-membership] Whop scan done. Pages: ${page}, Total: ${totalScanned}, no match: ${normalizedEmail}`);
            break;
          }

          page++;
        }
      } catch (whopErr) {
        console.error("[check-membership] Whop fetch error:", whopErr);
      }
    } else {
      console.warn("[check-membership] WHOP_API_KEY not set, skipping Whop check");
    }

    // --- 4. Not found anywhere ---
    console.log("[check-membership] Not found:", normalizedEmail);
    return new Response(
      JSON.stringify({ found: false }),
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
