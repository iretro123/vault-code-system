import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

/**
 * sync-stripe-members — UPGRADE pass (the mirror of sweep-stripe-access).
 *
 * sweep-stripe-access only ever DOWNGRADES (paid -> Free Basic).
 * Nothing repaired the opposite direction, so a genuine Stripe payer whose
 * student / student_access rows were missing or orphaned stayed stuck on
 * basic_tier with no Signals / Live access.
 *
 * This function walks accounts, asks Stripe "does this email have a live
 * subscription?" and, when the answer is yes:
 *   1. ensures a `students` row linked to the auth user (auth_user_id)
 *   2. upserts the `student_access` row (keyed on students.id — NOT auth uid)
 *   3. grants the paid role (vault_access) and clears basic_tier
 *   4. keeps profiles.access_status = 'active'
 *
 * It NEVER downgrades or revokes anyone — that stays the sweep's job — so it is
 * always safe to re-run.
 */

// Must stay in sync with stripe-webhook/index.ts and reconcile-access/index.ts
const PRICE_MAP: Record<string, { product_key: string; tier: string }> = {
  "price_1SB2aaAMsd1FtcvL44ONekRC": { product_key: "vault_academy", tier: "elite_v1" },
  "price_1SB2YsAMsd1FtcvLHfcvmDCr": { product_key: "vault_academy", tier: "elite_v1" },
  "price_1SB2VTAMsd1FtcvLjvrGfpm6": { product_key: "vault_academy", tier: "elite_v1" },
};

const DEFAULT_PRODUCT_KEY = "vault_academy";
const DEFAULT_TIER = "elite_v1";
const PAID_ROLE = "vault_access";

const LIVE_STRIPE_STATUSES = ["active", "trialing", "past_due", "unpaid", "incomplete"];

const STATUS_MAP: Record<string, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  unpaid: "past_due",
  incomplete: "past_due",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Admin = ReturnType<typeof createClient>;

/** Grant full (paid) access without ever touching staff roles. */
async function grantPaidAccess(admin: Admin, authUserId: string, subscriptionStatus: string) {
  // Remove the Free Basic gate — basic_tier wins in the client role priority.
  await admin.from("user_roles").delete().eq("user_id", authUserId).eq("role", "basic_tier");

  const { data: existing } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", authUserId)
    .eq("role", PAID_ROLE)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("user_roles")
      .update({ subscription_status: subscriptionStatus, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await admin
      .from("user_roles")
      .insert({ user_id: authUserId, role: PAID_ROLE, subscription_status: subscriptionStatus });
  }

  await admin
    .from("profiles")
    .update({ access_status: "active", updated_at: new Date().toISOString() })
    .eq("user_id", authUserId)
    .neq("access_status", "banned");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const traceId = crypto.randomUUID().slice(0, 8);
  const log = (s: string, d?: unknown) =>
    console.log(`[sync-stripe-members][${traceId}] ${s}`, d ? JSON.stringify(d) : "");

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Two entry paths: automated cron (x-cron-secret) OR operator/owner JWT.
    const cronSecretHeader = req.headers.get("x-cron-secret");
    const cronSecret = Deno.env.get("SWEEP_CRON_TOKEN") || Deno.env.get("CRON_SECRET");
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
      const [{ data: isOp }, { data: isOwner }] = await Promise.all([
        admin.rpc("has_role", { _user_id: user.id, _role: "operator" }),
        admin.rpc("has_role", { _user_id: user.id, _role: "vault_os_owner" }),
      ]);
      if (!isOp && !isOwner) throw new Error("Unauthorized: operator role required");
      actorId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const limit = Math.min(Math.max(Number(body?.limit) || 500, 1), 2000);
    const offset = Math.max(Number(body?.offset) || 0, 0);
    const onlyEmails: string[] = Array.isArray(body?.emails)
      ? body.emails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean)
      : [];

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Candidate accounts: everyone, or a targeted email list.
    let query = admin
      .from("profiles")
      .select("user_id, email, access_status")
      .not("email", "is", null)
      .order("created_at", { ascending: true });
    if (onlyEmails.length) query = query.in("email", onlyEmails);
    else query = query.range(offset, offset + limit - 1);

    const { data: profiles, error: profErr } = await query;
    if (profErr) throw profErr;

    const candidates = (profiles || []).filter((p) => !!p.user_id && !!p.email);
    const ids = candidates.map((p) => p.user_id as string);

    // Existing roles + students links, fetched in bulk.
    const [{ data: roleRows }, { data: studentRows }] = await Promise.all([
      ids.length
        ? admin.from("user_roles").select("user_id, role").in("user_id", ids)
        : Promise.resolve({ data: [] as { user_id: string; role: string }[] }),
      ids.length
        ? admin.from("students").select("id, email, auth_user_id, stripe_customer_id").in("auth_user_id", ids)
        : Promise.resolve({ data: [] as Record<string, string>[] }),
    ]);

    const rolesByUser = new Map<string, Set<string>>();
    for (const r of roleRows || []) {
      const set = rolesByUser.get(r.user_id as string) || new Set<string>();
      set.add(String(r.role));
      rolesByUser.set(r.user_id as string, set);
    }
    const studentByAuth = new Map<string, { id: string; stripe_customer_id: string | null }>(
      (studentRows || []).map((s) => [
        s.auth_user_id as string,
        { id: s.id as string, stripe_customer_id: (s.stripe_customer_id as string) || null },
      ]),
    );

    const results: Array<Record<string, unknown>> = [];
    let scanned = 0;
    let upgraded = 0;
    let alreadyPaid = 0;
    let noStripe = 0;
    let lookupErrors = 0;
    let skippedStaff = 0;

    for (const p of candidates) {
      const uid = p.user_id as string;
      const email = String(p.email).trim().toLowerCase();
      const roles = rolesByUser.get(uid) || new Set<string>();

      // Never touch staff.
      if (roles.has("vault_os_owner") || roles.has("operator")) {
        skippedStaff++;
        continue;
      }

      scanned++;

      // Find a live Stripe subscription for this email.
      let customerId: string | null = studentByAuth.get(uid)?.stripe_customer_id || null;
      let sub: Stripe.Subscription | null = null;
      let lookupFailed = false;

      try {
        const customers: string[] = [];
        if (customerId) customers.push(customerId);
        const list = await stripe.customers.list({ email, limit: 5 });
        for (const c of list.data) if (!customers.includes(c.id)) customers.push(c.id);

        for (const cid of customers) {
          const subs = await stripe.subscriptions.list({ customer: cid, status: "all", limit: 10 });
          const live = subs.data.find((s) => LIVE_STRIPE_STATUSES.includes(s.status));
          if (live) {
            sub = live;
            customerId = cid;
            break;
          }
        }
      } catch (e) {
        lookupFailed = true;
        log("stripe_lookup_failed", { email, error: (e as Error).message });
      }

      if (lookupFailed) {
        lookupErrors++;
        results.push({ email, result: "stripe_lookup_error" });
        continue;
      }

      if (!sub) {
        // No live subscription — leave them exactly as they are (whitelist /
        // manual grants / Free Basic all stay untouched). Downgrades are the
        // sweep's responsibility, never this function's.
        noStripe++;
        continue;
      }

      const priceId = sub.items.data[0]?.price?.id || null;
      const mapped = (priceId && PRICE_MAP[priceId]) || null;
      const productKey = mapped?.product_key || DEFAULT_PRODUCT_KEY;
      const tier = mapped?.tier || DEFAULT_TIER;
      const accessStatus = STATUS_MAP[sub.status] || "active";
      const now = new Date().toISOString();

      const alreadyHasPaid = roles.has(PAID_ROLE) || roles.has("vault_intelligence");

      results.push({
        email,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        stripe_status: sub.status,
        access_status: accessStatus,
        result: alreadyHasPaid ? "relinked_already_paid" : "upgraded_to_paid",
      });

      if (dryRun) {
        alreadyHasPaid ? alreadyPaid++ : upgraded++;
        continue;
      }

      // 1. students row (the join key student_access actually uses)
      let studentId = studentByAuth.get(uid)?.id || null;
      if (!studentId) {
        const { data: byEmail } = await admin
          .from("students")
          .select("id, auth_user_id")
          .eq("email", email)
          .maybeSingle();
        if (byEmail?.id) {
          studentId = byEmail.id as string;
          await admin
            .from("students")
            .update({ auth_user_id: uid, stripe_customer_id: customerId, updated_at: now })
            .eq("id", studentId);
        } else {
          const { data: created, error: createErr } = await admin
            .from("students")
            .insert({ email, auth_user_id: uid, stripe_customer_id: customerId })
            .select("id")
            .single();
          if (createErr) {
            results.push({ email, result: "student_create_failed", error: createErr.message });
            continue;
          }
          studentId = created.id as string;
        }
      } else {
        await admin
          .from("students")
          .update({ stripe_customer_id: customerId, updated_at: now })
          .eq("id", studentId);
      }

      // 2. student_access row (upsert on the students.id + product_key pair)
      const { data: existingAccess } = await admin
        .from("student_access")
        .select("id, status")
        .eq("user_id", studentId)
        .eq("product_key", productKey)
        .maybeSingle();

      const accessPatch = {
        status: accessStatus,
        tier,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        access_ended_at: null,
        last_synced_at: now,
        updated_at: now,
      };

      if (existingAccess?.id) {
        await admin.from("student_access").update(accessPatch).eq("id", existingAccess.id);
      } else {
        await admin.from("student_access").insert({
          user_id: studentId,
          product_key: productKey,
          is_lifetime: false,
          access_granted_at: now,
          ...accessPatch,
        });
      }

      // 3. paid role + active profile
      await grantPaidAccess(admin, uid, accessStatus);

      await admin.from("audit_logs").insert({
        admin_id: actorId ?? "00000000-0000-0000-0000-000000000000",
        target_user_id: uid,
        action: isCron ? "sync_stripe_members_cron" : "sync_stripe_members",
        metadata: {
          target_email: email,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          stripe_status: sub.status,
          new_status: accessStatus,
          granted_role: PAID_ROLE,
          previously_paid: alreadyHasPaid,
        },
      });

      alreadyHasPaid ? alreadyPaid++ : upgraded++;
    }

    const summary = {
      scanned,
      upgraded,
      relinked_already_paid: alreadyPaid,
      no_live_stripe_subscription: noStripe,
      stripe_lookup_errors: lookupErrors,
      skipped_staff: skippedStaff,
      dry_run: dryRun,
      offset,
      limit,
    };
    log("DONE", summary);

    return new Response(JSON.stringify({ ...summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sync-stripe-members] ERROR", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
