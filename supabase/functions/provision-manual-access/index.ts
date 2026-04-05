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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const sb = createClient(supabaseUrl, serviceKey);

    const { email, auth_user_id } = await req.json();
    if (!email || !auth_user_id) {
      return new Response(JSON.stringify({ error: "email and auth_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- AUTH: Two paths ---
    const authHeader = req.headers.get("Authorization");
    let isOperatorCall = false;
    let isSelfProvision = false;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);

      if (!claimsErr && claimsData?.claims?.sub) {
        const callerId = claimsData.claims.sub as string;
        const { data: isOp } = await sb.rpc("has_role", {
          _user_id: callerId,
          _role: "operator",
        });
        if (isOp) {
          isOperatorCall = true;
          console.log("[provision] Operator call by:", callerId);
        } else if (callerId === auth_user_id) {
          isSelfProvision = true;
          console.log("[provision] Self-provision call by:", callerId);
        }
      }
    }

    if (!isOperatorCall && !isSelfProvision) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Original provisioning logic ---
    const normalizedEmail = email.trim().toLowerCase();

    // PATH A: Whitelist
    const { data: whitelist } = await sb
      .from("allowed_signups")
      .select("id, stripe_customer_id")
      .eq("email", normalizedEmail)
      .eq("claimed", false)
      .maybeSingle();

    if (whitelist) {
      return await provisionUser(sb, {
        normalizedEmail,
        auth_user_id,
        stripeCustomerId: whitelist.stripe_customer_id || null,
        source: "whitelist",
        whitelistId: whitelist.id,
      });
    }

    // PATH B: Whop
    console.log("[provision] No whitelist entry for:", normalizedEmail, "→ checking Whop");
    const whopKey = Deno.env.get("WHOP_API_KEY");
    if (whopKey) {
      const whopActive = await checkWhopMembership(normalizedEmail, whopKey);
      if (whopActive) {
        console.log("[provision] Whop active membership found for:", normalizedEmail);
        return await provisionUser(sb, {
          normalizedEmail,
          auth_user_id,
          stripeCustomerId: null,
          source: "whop",
          whitelistId: null,
        });
      }
      console.log("[provision] No active Whop membership for:", normalizedEmail);
    } else {
      console.warn("[provision] WHOP_API_KEY not set, skipping Whop check");
    }

    // PATH C: Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripeCustomerId = await checkStripeMembership(normalizedEmail, stripeKey);
      if (stripeCustomerId) {
        console.log("[provision] Stripe customer found for:", normalizedEmail);
        return await provisionUser(sb, {
          normalizedEmail,
          auth_user_id,
          stripeCustomerId,
          source: "stripe",
          whitelistId: null,
        });
      }

      // PATH C.5: Stripe charges by receipt_email (catches GHL payments)
      const chargeFound = await checkStripeCharges(normalizedEmail, stripeKey);
      if (chargeFound) {
        console.log("[provision] Stripe charge (receipt_email) found for:", normalizedEmail);
        return await provisionUser(sb, {
          normalizedEmail,
          auth_user_id,
          stripeCustomerId: null,
          source: "stripe",
          whitelistId: null,
        });
      }

      console.log("[provision] No Stripe customer or charge for:", normalizedEmail);
    }

    // PATH D: GHL Contacts API
    const ghlKey = Deno.env.get("GHL_API_KEY");
    const ghlLocationId = Deno.env.get("GHL_LOCATION_ID");
    if (ghlKey && ghlLocationId) {
      const ghlFound = await checkGHLContact(normalizedEmail, ghlKey, ghlLocationId);
      if (ghlFound) {
        console.log("[provision] GHL contact found for:", normalizedEmail);
        return await provisionUser(sb, {
          normalizedEmail,
          auth_user_id,
          stripeCustomerId: null,
          source: "ghl",
          whitelistId: null,
        });
      }
      console.log("[provision] No GHL contact for:", normalizedEmail);
    } else {
      console.warn("[provision] GHL_API_KEY or GHL_LOCATION_ID not set, skipping GHL check");
    }

    // --- Not found anywhere ---
    console.log("[provision] No unclaimed whitelist or active membership for:", normalizedEmail);
    return new Response(JSON.stringify({ provisioned: false, reason: "not_whitelisted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[provision] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Whop membership check ──
async function checkWhopMembership(email: string, whopKey: string): Promise<boolean> {
  try {
    let page = 1;
    let totalPages = 999;
    let totalScanned = 0;

    while (page <= totalPages) {
      const url = `https://api.whop.com/api/v2/members?per=50&page=${page}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${whopKey}` },
      });

      if (!res.ok) {
        console.error("[provision] Whop API error on page", page, ":", res.status);
        return false;
      }

      const data = await res.json();
      const members = data.data ?? [];

      if (data.pagination?.total_page) {
        totalPages = data.pagination.total_page;
      }

      if (!Array.isArray(members) || members.length === 0) break;

      totalScanned += members.length;

      for (const m of members) {
        const mEmail = (m.email ?? "").trim().toLowerCase();
        if (mEmail === email) {
          console.log(`[provision] Whop MATCH page ${page}/${totalPages} (scanned ${totalScanned}):`, email);
          return true;
        }
      }

      page++;
    }
    console.log(`[provision] Whop scan done. ${totalScanned} members across ${totalPages} pages, no match: ${email}`);
  } catch (err) {
    console.error("[provision] Whop fetch error:", err);
  }
  return false;
}

// ── Stripe customer check ──
async function checkStripeMembership(email: string, stripeKey: string): Promise<string | null> {
  try {
    const url = `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].id;
      }
    }
  } catch (err) {
    console.error("[provision] Stripe check error:", err);
  }
  return null;
}

// ── Stripe charges check (catches GHL payments by receipt_email) ──
async function checkStripeCharges(email: string, stripeKey: string): Promise<boolean> {
  try {
    const url = `https://api.stripe.com/v1/charges?receipt_email=${encodeURIComponent(email)}&limit=5`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const paidCharge = data.data.find((c: any) => c.paid === true);
        if (paidCharge) {
          console.log("[provision] Found paid Stripe charge by receipt_email:", email, paidCharge.id);
          return true;
        }
      }
    }
  } catch (err) {
    console.error("[provision] Stripe charges check error:", err);
  }
  return false;
}

// ── GHL Contact check ──
async function checkGHLContact(email: string, ghlKey: string, locationId: string): Promise<boolean> {
  try {
    const url = `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${encodeURIComponent(locationId)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${ghlKey}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.contact && data.contact.id) {
        console.log("[provision] GHL contact found:", email, "id:", data.contact.id);
        return true;
      }
    } else {
      console.error("[provision] GHL API error:", res.status);
    }
  } catch (err) {
    console.error("[provision] GHL fetch error:", err);
  }
  return false;
}

// ── Shared provisioning logic ──
async function provisionUser(
  sb: any,
  opts: {
    normalizedEmail: string;
    auth_user_id: string;
    stripeCustomerId: string | null;
    source: "whitelist" | "whop" | "stripe" | "ghl";
    whitelistId: string | null;
  }
) {
  const { normalizedEmail, auth_user_id, stripeCustomerId, source, whitelistId } = opts;

  if (whitelistId) {
    await sb.from("allowed_signups").update({ claimed: true }).eq("id", whitelistId);
    console.log("[provision] Marked whitelist entry as claimed:", whitelistId);
  }

  const { data: existingStudent } = await sb
    .from("students")
    .select("id")
    .eq("auth_user_id", auth_user_id)
    .maybeSingle();

  if (existingStudent) {
    console.log("[provision] Student already exists for:", auth_user_id);
    return new Response(JSON.stringify({ provisioned: false, reason: "already_exists" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: newStudent, error: studentErr } = await sb
    .from("students")
    .insert({
      email: normalizedEmail,
      auth_user_id,
      stripe_customer_id: stripeCustomerId,
    })
    .select("id")
    .single();

  if (studentErr || !newStudent) {
    console.error("[provision] Failed to create student:", studentErr?.message);
    return new Response(JSON.stringify({ error: "Failed to create student record" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: accessErr } = await sb
    .from("student_access")
    .insert({
      user_id: newStudent.id,
      status: "active",
      product_key: "vault_academy",
      tier: "elite_v1",
      stripe_customer_id: stripeCustomerId,
    });

  if (accessErr) {
    console.error("[provision] Failed to create student_access:", accessErr.message);
    return new Response(JSON.stringify({ error: "Failed to create access record" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: profileErr } = await sb
    .from("profiles")
    .update({ access_status: "active" })
    .eq("user_id", auth_user_id);

  if (profileErr) {
    console.warn("[provision] Failed to update profiles.access_status:", profileErr.message);
  }

  console.log(`[provision] Successfully provisioned via ${source} for:`, normalizedEmail, "student_id:", newStudent.id);
  return new Response(JSON.stringify({ provisioned: true, student_id: newStudent.id, source }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
