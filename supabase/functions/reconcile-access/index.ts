import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRICE_MAP: Record<string, { product_key: string; tier: string }> = {
  "price_1SB2aaAMsd1FtcvL44ONekRC": { product_key: "vault_academy", tier: "elite_v1" },
  "price_1SB2YsAMsd1FtcvLHfcvmDCr": { product_key: "vault_academy", tier: "elite_v1" },
  "price_1SB2VTAMsd1FtcvLjvrGfpm6": { product_key: "vault_academy", tier: "elite_v1" },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = crypto.randomUUID().slice(0, 8);
  const log = (step: string, d?: unknown) =>
    console.log(`[reconcile-access][${traceId}] ${step}`, d ? JSON.stringify(d) : "");

  try {
    // Auth: validate JWT and check operator role
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Decode JWT to get caller
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { persistSession: false },
        global: { headers: { authorization: authHeader } },
      }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check operator role server-side
    const { data: roleCheck } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "operator",
    });
    if (!roleCheck) {
      const { data: ownerCheck } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "vault_os_owner",
      });
      if (!ownerCheck) throw new Error("Unauthorized: requires operator or vault_os_owner role");
    }

    // Parse body
    const { student_id } = await req.json();
    if (!student_id) throw new Error("student_id is required");

    log("START", { student_id, caller: user.id });

    // Get student record
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id, email, stripe_customer_id")
      .eq("id", student_id)
      .single();
    if (studentErr || !student) throw new Error("Student not found");

    // Get current access
    const { data: currentAccess } = await supabase
      .from("student_access")
      .select("status, stripe_subscription_id, stripe_price_id, tier, product_key")
      .eq("user_id", student_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousStatus = currentAccess?.status || "none";
    const subId = currentAccess?.stripe_subscription_id;
    const customerId = student.stripe_customer_id;

    if (!subId && !customerId) {
      log("NO_STRIPE_IDS");
      return new Response(
        JSON.stringify({
          changed: false,
          previous_status: previousStatus,
          new_status: previousStatus,
          reason: "No Stripe subscription or customer ID on record",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch from Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    let subscription: Stripe.Subscription | null = null;

    if (subId) {
      try {
        subscription = await stripe.subscriptions.retrieve(subId);
        log("FETCHED_SUB_BY_ID", { status: subscription.status });
      } catch (e) {
        log("SUB_FETCH_FAILED", { error: (e as Error).message });
      }
    }

    if (!subscription && customerId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
        status: "all",
      });
      subscription = subs.data[0] || null;
      if (subscription) log("FETCHED_SUB_BY_CUSTOMER", { status: subscription.status });
    }

    if (!subscription) {
      log("NO_SUBSCRIPTION_FOUND");
      return new Response(
        JSON.stringify({
          changed: false,
          previous_status: previousStatus,
          new_status: previousStatus,
          reason: "No Stripe subscription found for this customer",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map status
    const statusMap: Record<string, string> = {
      active: "active",
      trialing: "trialing",
      past_due: "past_due",
      canceled: "canceled",
      unpaid: "past_due",
      incomplete: "past_due",
      incomplete_expired: "canceled",
      paused: "paused",
    };
    const newStatus = statusMap[subscription.status] || "active";
    const priceId = subscription.items?.data?.[0]?.price?.id || null;
    const plan = priceId && PRICE_MAP[priceId]
      ? PRICE_MAP[priceId]
      : { product_key: "vault_academy", tier: "elite_v1" };

    const now = new Date().toISOString();
    const changed = newStatus !== previousStatus;

    // Upsert access
    const accessData: Record<string, unknown> = {
      user_id: student_id,
      product_key: plan.product_key,
      tier: plan.tier,
      status: newStatus,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      last_synced_at: now,
      updated_at: now,
    };
    if (newStatus === "active") {
      accessData.access_granted_at = now;
      accessData.access_ended_at = null;
    } else if (newStatus === "canceled") {
      accessData.access_ended_at = now;
    }

    await supabase.from("student_access").upsert(accessData, {
      onConflict: "user_id,product_key",
    });

    // Audit log
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      target_user_id: student_id,
      action: "reconcile_access",
      metadata: {
        previous_status: previousStatus,
        new_status: newStatus,
        changed,
        stripe_subscription_id: subscription.id,
        stripe_status: subscription.status,
        reason: "Manual reconcile from Stripe",
      },
    });

    log("DONE", { changed, previousStatus, newStatus });

    return new Response(
      JSON.stringify({
        changed,
        previous_status: previousStatus,
        new_status: newStatus,
        reason: changed
          ? `Status updated from ${previousStatus} to ${newStatus} based on Stripe subscription ${subscription.id}`
          : `No change — Stripe subscription status matches (${newStatus})`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    log("ERROR", { error: (err as Error).message });
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
