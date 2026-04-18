/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // --- 1. Check Stripe customers ---
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripeUrl = `https://api.stripe.com/v1/customers?email=${encodeURIComponent(normalizedEmail)}&limit=1`;
      const stripeRes = await fetch(stripeUrl, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });

      if (stripeRes.ok) {
        const stripeData = await stripeRes.json();
        if (stripeData.data && stripeData.data.length > 0) {
          const customerId = stripeData.data[0].id;
          console.log("[check-membership] Found Stripe customer:", normalizedEmail, customerId);

          // Check for active subscription or trial
          const subsUrl = `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&limit=10`;
          const subsRes = await fetch(subsUrl, {
            headers: { Authorization: `Bearer ${stripeKey}` },
          });
          if (subsRes.ok) {
            const subsData = await subsRes.json();
            const activeSub = (subsData.data ?? []).find(
              (s: any) => s.status === "active" || s.status === "trialing"
            );
            if (activeSub) {
              console.log("[check-membership] Active subscription found:", activeSub.id, "status:", activeSub.status);
              return new Response(
                JSON.stringify({ found: true, status: activeSub.status }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }

          // Customer exists but no active sub — still allow (could be one-time purchase)
          console.log("[check-membership] Stripe customer exists, no active sub — allowing:", normalizedEmail);
          return new Response(
            JSON.stringify({ found: true, status: "active" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.error("[check-membership] Stripe customers API error:", stripeRes.status);
      }
    } else {
      console.warn("[check-membership] STRIPE_SECRET_KEY not set, skipping Stripe check");
    }

    // --- 2. Check Stripe charges by receipt_email (catches GHL payments) ---
    if (stripeKey) {
      try {
        const chargesUrl = `https://api.stripe.com/v1/charges?limit=5`;
        const chargesRes = await fetch(
          `${chargesUrl}&receipt_email=${encodeURIComponent(normalizedEmail)}`,
          { headers: { Authorization: `Bearer ${stripeKey}` } }
        );
        if (chargesRes.ok) {
          const chargesData = await chargesRes.json();
          if (chargesData.data && chargesData.data.length > 0) {
            const paidCharge = chargesData.data.find((c: any) => c.paid === true);
            if (paidCharge) {
              console.log("[check-membership] Found paid Stripe charge by receipt_email:", normalizedEmail, paidCharge.id);
              return new Response(
                JSON.stringify({ found: true, status: "active" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
        console.log("[check-membership] No Stripe charges found for receipt_email:", normalizedEmail);
      } catch (chargeErr) {
        console.error("[check-membership] Stripe charges check error:", chargeErr);
      }
    }

    // --- 3. Check allowed_signups whitelist ---
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

    // --- 4. Check GHL Contacts API ---
    const ghlKey = Deno.env.get("GHL_API_KEY");
    const ghlLocationId = Deno.env.get("GHL_LOCATION_ID");
    if (ghlKey && ghlLocationId) {
      try {
        const ghlUrl = `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${encodeURIComponent(ghlLocationId)}&email=${encodeURIComponent(normalizedEmail)}`;
        const ghlRes = await fetch(ghlUrl, {
          headers: {
            Authorization: `Bearer ${ghlKey}`,
            Version: "2021-07-28",
            Accept: "application/json",
          },
        });

        if (ghlRes.ok) {
          const ghlData = await ghlRes.json();
          const contact = ghlData.contact;
          if (contact && contact.id) {
            console.log("[check-membership] GHL contact found:", normalizedEmail, "id:", contact.id);
            return new Response(
              JSON.stringify({ found: true, status: "active" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          console.log("[check-membership] No GHL contact for:", normalizedEmail);
        } else {
          console.error("[check-membership] GHL API error:", ghlRes.status, await ghlRes.text());
        }
      } catch (ghlErr) {
        console.error("[check-membership] GHL fetch error:", ghlErr);
      }
    } else {
      console.warn("[check-membership] GHL_API_KEY or GHL_LOCATION_ID not set, skipping GHL check");
    }

    // --- 5. Fallback: Check Whop (paginate ALL active members) ---
    const whopKey = Deno.env.get("WHOP_API_KEY");
    if (whopKey) {
      try {
        let page = 1;
        let totalPages = 999;
        let totalScanned = 0;

        while (page <= totalPages) {
          const whopUrl = `https://api.whop.com/api/v2/members?per=50&page=${page}`;
          const whopRes = await fetch(whopUrl, {
            headers: { Authorization: `Bearer ${whopKey}` },
          });

          if (!whopRes.ok) {
            console.error("[check-membership] Whop API error on page", page, ":", whopRes.status);
            break;
          }

          const whopData = await whopRes.json();
          const members = whopData.data ?? [];

          if (whopData.pagination?.total_page) {
            totalPages = whopData.pagination.total_page;
          }

          if (!Array.isArray(members) || members.length === 0) break;

          totalScanned += members.length;

          for (const m of members) {
            const mEmail = (m.email ?? "").trim().toLowerCase();
            if (mEmail === normalizedEmail) {
              console.log(`[check-membership] Whop MATCH page ${page}/${totalPages} (scanned ${totalScanned}):`, normalizedEmail);
              return new Response(
                JSON.stringify({ found: true, status: "active" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }

          page++;
        }
        console.log(`[check-membership] Whop scan done. ${totalScanned} members across ${totalPages} pages, no match: ${normalizedEmail}`);
      } catch (whopErr) {
        console.error("[check-membership] Whop fetch error:", whopErr);
      }
    } else {
      console.warn("[check-membership] WHOP_API_KEY not set, skipping Whop check");
    }

    // --- 6. Not found anywhere — return generic response to prevent email enumeration ---
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
