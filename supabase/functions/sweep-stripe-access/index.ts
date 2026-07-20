import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_MAP: Record<string, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "past_due",
  incomplete: "past_due",
  incomplete_expired: "canceled",
  paused: "paused",
};

interface StudentRow {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
}

interface AccessRow {
  user_id: string;
  status: string;
  is_lifetime: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  product_key: string;
  tier: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const traceId = crypto.randomUUID().slice(0, 8);
  const log = (s: string, d?: unknown) =>
    console.log(`[sweep-stripe-access][${traceId}] ${s}`, d ? JSON.stringify(d) : "");

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Two entry paths: automated cron (x-cron-secret) OR authenticated operator/owner/admin.
    const cronSecretHeader = req.headers.get("x-cron-secret");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const isCron = !!cronSecret && cronSecretHeader === cronSecret;

    let actorId: string | null = null;
    if (!isCron) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) throw new Error("Missing authorization header");
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false }, global: { headers: { authorization: authHeader } } },
      );
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) throw new Error("Unauthorized");
      const [{ data: isOp }, { data: isOwner }, { data: isAdmin }] = await Promise.all([
        admin.rpc("has_role", { _user_id: user.id, _role: "operator" }),
        admin.rpc("has_role", { _user_id: user.id, _role: "vault_os_owner" }),
        admin.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      ]);
      if (!isOp && !isOwner && !isAdmin) throw new Error("Unauthorized: operator role required");
      actorId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const limit = Math.min(Math.max(Number(body?.limit) || 500, 1), 2000);
    // How many days a member can stay in past_due before being auto-locked.
    const graceDays = Math.min(Math.max(Number(body?.grace_days) || 3, 1), 30);
    const graceCutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000).toISOString();

    // Sweep active/trialing/past_due, skip lifetime.
    const { data: rows, error: fetchErr } = await admin
      .from("student_access")
      .select("user_id, status, is_lifetime, stripe_customer_id, stripe_subscription_id, product_key, tier, updated_at")
      .eq("product_key", "vault_academy")
      .in("status", ["active", "trialing", "past_due"])
      .eq("is_lifetime", false)
      .limit(limit);
    if (fetchErr) throw fetchErr;
    const access = (rows || []) as (AccessRow & { updated_at: string })[];

    if (access.length === 0) {
      return new Response(JSON.stringify({ scanned: 0, updated: 0, dry_run: dryRun, changes: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const studentIds = access.map((r) => r.user_id);
    const { data: students } = await admin
      .from("students")
      .select("id, email, stripe_customer_id")
      .in("id", studentIds);
    const studentMap = new Map<string, StudentRow>((students || []).map((s) => [s.id, s as StudentRow]));

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const changes: Array<Record<string, unknown>> = [];
    let updated = 0;
    let noStripe = 0;

    for (const row of access) {
      const student = studentMap.get(row.user_id);
      if (!student) continue;
      const email = student.email?.trim().toLowerCase() || null;

      // Resolve Stripe customer
      let customerId = row.stripe_customer_id || student.stripe_customer_id || null;
      if (!customerId && email) {
        try {
          const list = await stripe.customers.list({ email, limit: 3 });
          customerId = list.data[0]?.id || null;
          if (customerId && !student.stripe_customer_id) {
            await admin.from("students").update({ stripe_customer_id: customerId }).eq("id", student.id);
          }
        } catch (e) {
          log("customer_lookup_failed", { email, error: (e as Error).message });
        }
      }

      if (!customerId) {
        noStripe++;
        changes.push({ user_id: row.user_id, email, result: "no_stripe_customer", from: row.status, to: row.status });
        continue;
      }

      // Fetch latest subscription
      let sub: Stripe.Subscription | null = null;
      try {
        if (row.stripe_subscription_id) {
          sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
        }
      } catch (_e) { /* fall through to list */ }
      if (!sub) {
        try {
          const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
          sub = subs.data[0] || null;
        } catch (e) {
          log("sub_list_failed", { customerId, error: (e as Error).message });
        }
      }

      const stripeStatus = sub?.status || "canceled";
      const newStatus = sub ? (STATUS_MAP[stripeStatus] || "canceled") : "canceled";

      if (newStatus === row.status) continue;

      changes.push({
        user_id: row.user_id,
        email,
        stripe_customer_id: customerId,
        stripe_status: stripeStatus,
        from: row.status,
        to: newStatus,
      });

      if (!dryRun) {
        const now = new Date().toISOString();
        const patch: Record<string, unknown> = {
          status: newStatus,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub?.id || row.stripe_subscription_id,
          last_synced_at: now,
          updated_at: now,
        };
        if (newStatus === "canceled") patch.access_ended_at = now;
        await admin
          .from("student_access")
          .update(patch)
          .eq("user_id", row.user_id)
          .eq("product_key", row.product_key);
        updated++;

        await admin.from("audit_logs").insert({
          admin_id: user.id,
          target_user_id: row.user_id,
          action: "sweep_stripe_access",
          metadata: {
            previous_status: row.status,
            new_status: newStatus,
            stripe_status: stripeStatus,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub?.id || null,
            target_email: email,
          },
        });
      }
    }

    log("DONE", { scanned: access.length, updated, noStripe, dryRun });

    return new Response(
      JSON.stringify({ scanned: access.length, updated, no_stripe: noStripe, dry_run: dryRun, changes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[sweep-stripe-access] ERROR", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
