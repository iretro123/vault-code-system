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

    // --- Parse body first so we can use auth_user_id for validation ---
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

    // 1. Check if this email is in allowed_signups and NOT yet claimed
    const { data: whitelist } = await sb
      .from("allowed_signups")
      .select("id, stripe_customer_id")
      .eq("email", normalizedEmail)
      .eq("claimed", false)
      .maybeSingle();

    // --- PATH A: Whitelist found → provision via whitelist ---
    if (whitelist) {
      return await provisionUser(sb, {
        normalizedEmail,
        auth_user_id,
        stripeCustomerId: whitelist.stripe_customer_id || null,
        source: "whitelist",
        whitelistId: whitelist.id,
      });
    }

    // --- PATH B: No whitelist → check Whop API for active membership ---
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

    // --- PATH C: Also check Stripe as fallback ---
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
      console.log("[provision] No Stripe customer for:", normalizedEmail);
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

// ── Whop membership check (paginated, server-side email match) ──
async function checkWhopMembership(email: string, whopKey: string): Promise<boolean> {
  try {
    const MAX_PAGES = 10;
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= MAX_PAGES) {
      const url = `https://api.whop.com/api/v2/memberships?per=50&page=${page}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${whopKey}` },
      });

      if (!res.ok) {
        console.error("[provision] Whop API error:", res.status, await res.text());
        break;
      }

      const data = await res.json();
      const memberships = data.data ?? data.pagination?.data ?? [];

      if (!Array.isArray(memberships) || memberships.length === 0) break;

      for (const m of memberships) {
        const mEmail = (m.email ?? "").trim().toLowerCase();
        const mUserEmail = (m.user?.email ?? "").trim().toLowerCase();

        if (mEmail === email || mUserEmail === email) {
          const isActive = m.valid === true && ["active", "trialing", "completed"].includes(m.status);
          if (isActive) return true;
          console.log(`[provision] Whop match but inactive: valid=${m.valid}, status=${m.status}`);
          return false;
        }
      }

      const pagination = data.pagination;
      if (pagination && pagination.current_page < pagination.last_page) {
        page++;
      } else if (memberships.length < 50) {
        hasMore = false;
      } else {
        page++;
      }
    }
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

// ── Shared provisioning logic ──
async function provisionUser(
  sb: any,
  opts: {
    normalizedEmail: string;
    auth_user_id: string;
    stripeCustomerId: string | null;
    source: "whitelist" | "whop" | "stripe";
    whitelistId: string | null;
  }
) {
  const { normalizedEmail, auth_user_id, stripeCustomerId, source, whitelistId } = opts;

  // Mark whitelist as claimed if applicable
  if (whitelistId) {
    await sb.from("allowed_signups").update({ claimed: true }).eq("id", whitelistId);
    console.log("[provision] Marked whitelist entry as claimed:", whitelistId);
  }

  // Check if student already exists
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

  // Create students row
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

  // Create student_access row
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

  // Update profiles.access_status
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
