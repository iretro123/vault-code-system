/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { VAULT_OS_PRODUCT_KEY, VAULT_OS_TIER, grantPaidRole } from "../_shared/vaultAccess.ts";

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

    // PATH A: Whop active membership
    console.log("[provision] Checking active Whop membership for:", normalizedEmail);
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
        });
      }
      console.log("[provision] No active Whop membership for:", normalizedEmail);
    } else {
      console.warn("[provision] WHOP_API_KEY not set, skipping Whop check");
    }

    // PATH B: Stripe active/trialing subscription
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripeCustomerId = await checkStripeMembership(normalizedEmail, stripeKey);
      if (stripeCustomerId) {
        console.log("[provision] Active Stripe subscription found for:", normalizedEmail);
        return await provisionUser(sb, {
          normalizedEmail,
          auth_user_id,
          stripeCustomerId,
          source: "stripe",
        });
      }

      console.log("[provision] No active Stripe subscription for:", normalizedEmail);
    }

    // --- Not found anywhere ---
    console.log("[provision] No active Whop or Stripe subscription for:", normalizedEmail);
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
      const url = `https://api.whop.com/api/v2/memberships?per=50&page=${page}&valid=true`;
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
        const mEmail = (m.email ?? m.user?.email ?? "").trim().toLowerCase();
        const isActive = m.valid === true || m.status === "active";
        if (mEmail === email && isActive) {
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

// ── Stripe active/trialing subscription check ──
async function checkStripeMembership(email: string, stripeKey: string): Promise<string | null> {
  try {
    const url = `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const customerId = data.data[0].id;
        const subsUrl = `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&limit=10`;
        const subsRes = await fetch(subsUrl, {
          headers: { Authorization: `Bearer ${stripeKey}` },
        });
        if (subsRes.ok) {
          const subsData = await subsRes.json();
          const activeSub = (subsData.data ?? []).find(
            (s: any) => s.status === "active" || s.status === "trialing"
          );
          if (activeSub) return customerId;
        }
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
    source: "whop" | "stripe";
  }
) {
  const { normalizedEmail, auth_user_id, stripeCustomerId, source } = opts;

  const { data: existingStudent } = await sb
    .from("students")
    .select("id")
    .eq("auth_user_id", auth_user_id)
    .maybeSingle();

  let studentId: string | null = existingStudent?.id ?? null;

  if (!studentId) {
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
    studentId = newStudent.id;
  } else if (stripeCustomerId) {
    await sb.from("students").update({ stripe_customer_id: stripeCustomerId }).eq("id", studentId);
  }

  const newStudent = { id: studentId as string };


  const { error: accessErr } = await sb
    .from("student_access")
    .upsert({
      user_id: newStudent.id,
      status: "active",
      product_key: VAULT_OS_PRODUCT_KEY,
      tier: VAULT_OS_TIER,
      stripe_customer_id: stripeCustomerId,
      access_granted_at: new Date().toISOString(),
      access_ended_at: null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,product_key" });

  if (accessErr) {
    console.error("[provision] Failed to create student_access:", accessErr.message);
    return new Response(JSON.stringify({ error: "Failed to create access record" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Grant the paid Vault OS role (removes basic_tier/free) + mark profile active.
  await grantPaidRole(sb, auth_user_id, "active");

  console.log(`[provision] Successfully provisioned via ${source} for:`, normalizedEmail, "student_id:", newStudent.id);
  return new Response(JSON.stringify({ provisioned: true, student_id: newStudent.id, source }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
