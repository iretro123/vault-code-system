/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { VAULT_OS_PRODUCT_KEY, VAULT_OS_TIER, grantPaidRole, resolvePlanForPrice } from "../_shared/vaultAccess.ts";
import { ownsMembershipEmail } from "../_shared/membershipValidation.ts";

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
    if (typeof email !== "string" || !email.trim() || typeof auth_user_id !== "string" || !auth_user_id) {
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

    // The target account must own the billing email, including operator recovery.
    const { data: target, error: targetError } = await sb.auth.admin.getUserById(auth_user_id);
    if (targetError) throw targetError;
    if (!target.user?.email_confirmed_at || !ownsMembershipEmail(email, target.user?.email)) {
      return new Response(JSON.stringify({ error: "Use your verified account email for membership recovery" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Original provisioning logic ---
    const normalizedEmail = email.trim().toLowerCase();

    // Whitelist/native eligibility is independent of Stripe recovery.
    const { data: entitled, error: entitlementError } = await sb.rpc("vault_access_for_user", { uid: auth_user_id });
    if (entitlementError) throw entitlementError;
    if (entitled === true) return new Response(JSON.stringify({ provisioned: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Only an active approved Stripe subscription can recover paid access.
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const membership = await checkStripeMembership(normalizedEmail, stripeKey);
      if (membership) {
        console.log("[provision] Active Stripe subscription found for:", normalizedEmail);
        return await provisionUser(sb, {
          normalizedEmail,
          auth_user_id,
          stripeCustomerId: membership.customerId,
          stripeSubscriptionId: membership.subscriptionId,
          stripePriceId: membership.priceId,
          source: "stripe",
        });
      }

      console.log("[provision] No active Stripe subscription for:", normalizedEmail);
    }

    // --- Not found anywhere ---
    console.log("[provision] No active subscription for:", normalizedEmail);
    return new Response(JSON.stringify({ provisioned: false, reason: "no_active_membership" }), {
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


// ── Stripe active subscription check ──
async function checkStripeMembership(email: string, stripeKey: string): Promise<{ customerId: string; subscriptionId: string; priceId: string } | null> {
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
            (s: any) => s.status === "active" &&
              s.items?.data?.some((item: any) => resolvePlanForPrice(item.price?.id))
          );
          if (activeSub) return { customerId, subscriptionId: activeSub.id,
            priceId: activeSub.items.data.find((item: any) => resolvePlanForPrice(item.price?.id)).price.id };
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
    stripeSubscriptionId: string;
    stripePriceId: string;
    source: "stripe";
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
      stripe_subscription_id: opts.stripeSubscriptionId,
      stripe_price_id: opts.stripePriceId,
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
