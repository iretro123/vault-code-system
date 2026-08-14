import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { grantPaidRole } from "../_shared/vaultAccess.ts";

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
  auth_user_id: string | null;
}

const PREMIUM_ROLES = ["vault_access", "vault_intelligence"];

/**
 * Losing a paid subscription must NEVER lock a user out of the app.
 * Expired / canceled / orphan members are downgraded to the Free Basic tier:
 * they keep the app, community and free content, and lose Live + Signals +
 * premium modules. "revoked" is reserved for explicit admin bans only.
 */
async function downgradeToBasic(
  admin: ReturnType<typeof createClient>,
  authUserId: string | null,
  email: string | null,
) {
  if (!authUserId) return;

  // Staff (owner/operator) must never be touched by an automated sweep.
  const { data: staffRow } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", authUserId)
    .in("role", ["vault_os_owner", "operator"])
    .maybeSingle();
  if (staffRow?.id) {
    console.log("[sweep-stripe-access] skipped_staff", JSON.stringify({ authUserId, email }));
    return;
  }

  // Clear premium role rows so no paid feature stays unlocked.
  await admin.from("user_roles").delete().eq("user_id", authUserId).in("role", PREMIUM_ROLES);

  // Ensure a basic_tier role row exists (basic_tier wins in the client role priority).
  const { data: existing } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", authUserId)
    .eq("role", "basic_tier")
    .maybeSingle();
  if (existing?.id) {
    await admin
      .from("user_roles")
      .update({ subscription_status: "none", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await admin.from("user_roles").insert({
      user_id: authUserId,
      role: "basic_tier",
      subscription_status: "none",
    });
  }

  // Keep the account usable — never flip a non-banned user to "revoked".
  await admin
    .from("profiles")
    .update({ access_status: "active", updated_at: new Date().toISOString() })
    .eq("user_id", authUserId)
    .neq("access_status", "banned");

  console.log("[sweep-stripe-access] downgraded_to_basic", JSON.stringify({ authUserId, email }));
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
      .in("product_key", ["vault_academy", "vault_os"])
      .in("status", ["active", "trialing", "past_due"])
      .eq("is_lifetime", false)
      .limit(limit);
    if (fetchErr) throw fetchErr;
    const access = (rows || []) as (AccessRow & { updated_at: string })[];

    // NOTE: no early return here — the orphan pass below must still run even when
    // there are no student_access rows to sweep.



    const studentIds = access.map((r) => r.user_id);
    const { data: students } = await admin
      .from("students")
      .select("id, email, stripe_customer_id, auth_user_id")
      .in("id", studentIds);
    const studentMap = new Map<string, StudentRow>((students || []).map((s) => [s.id, s as StudentRow]));

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const changes: Array<Record<string, unknown>> = [];
    let updated = 0;
    let noStripe = 0;

    // Extra safety net: emails that must NEVER be flipped by the sweep, even if Stripe
    // has no record. Comma-separated env var.
    const protectedEmails = new Set(
      (Deno.env.get("SWEEP_PROTECTED_EMAILS") || "")
        .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
    );

    // Whitelisted members (manual/owner grants) keep full access regardless of
    // what Stripe says — they were never meant to have a Stripe subscription.
    const { data: mainWhitelist } = await admin.from("allowed_signups").select("email");
    const whitelistedEmails = new Set(
      (mainWhitelist || []).map((w) => (w.email || "").trim().toLowerCase()).filter(Boolean),
    );

    let skippedProtected = 0;
    let skippedLookupFailed = 0;

    for (const row of access) {
      const student = studentMap.get(row.user_id);
      if (!student) continue;
      const email = student.email?.trim().toLowerCase() || null;

      if (email && (protectedEmails.has(email) || whitelistedEmails.has(email))) {
        skippedProtected++;
        changes.push({ user_id: row.user_id, email, result: "skipped_protected", from: row.status, to: row.status });
        continue;
      }


      // Resolve Stripe customer (exact email match, then fuzzy search fallback)
      let customerId = row.stripe_customer_id || student.stripe_customer_id || null;
      let customerLookupErrored = false;
      if (!customerId && email) {
        try {
          const list = await stripe.customers.list({ email, limit: 3 });
          customerId = list.data[0]?.id || null;
          if (!customerId) {
            // Fuzzy fallback via Search API (handles casing/aliases and index delays differently)
            try {
              const search = await stripe.customers.search({ query: `email:'${email.replace(/'/g, "\\'")}'`, limit: 3 });
              customerId = search.data[0]?.id || null;
            } catch (_e) { /* search not critical */ }
          }
          if (customerId && !student.stripe_customer_id) {
            await admin.from("students").update({ stripe_customer_id: customerId }).eq("id", student.id);
          }
        } catch (e) {
          customerLookupErrored = true;
          log("customer_lookup_failed", { email, error: (e as Error).message });
        }
      }

      if (!customerId) {
        // SAFETY: no Stripe customer found. Do NOT change status — user may pay via
        // Whop/GHL/manual grant, or Stripe indexing may be delayed.
        noStripe++;
        changes.push({
          user_id: row.user_id, email,
          result: customerLookupErrored ? "stripe_lookup_error" : "no_stripe_customer",
          from: row.status, to: row.status,
        });
        continue;
      }

      // Fetch latest subscription. Track whether Stripe actually answered.
      let sub: Stripe.Subscription | null = null;
      let subQueryOk = false;
      try {
        if (row.stripe_subscription_id) {
          sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
          subQueryOk = true;
        }
      } catch (_e) { /* fall through to list */ }
      if (!sub) {
        try {
          const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
          sub = subs.data[0] || null;
          subQueryOk = true;
        } catch (e) {
          log("sub_list_failed", { customerId, error: (e as Error).message });
        }
      }

      if (!subQueryOk) {
        // SAFETY: Stripe API errored. Never downgrade access on a failed query.
        skippedLookupFailed++;
        changes.push({
          user_id: row.user_id, email, stripe_customer_id: customerId,
          result: "stripe_query_failed", from: row.status, to: row.status,
        });
        continue;
      }

      const stripeStatus = sub?.status || "canceled";
      let newStatus = sub ? (STATUS_MAP[stripeStatus] || "canceled") : "canceled";

      // 3-day grace: if row has been past_due for longer than graceDays and Stripe is still
      // not active, escalate to canceled (auto-boot).
      const pastDueTooLong =
        row.status === "past_due" &&
        row.updated_at < graceCutoff &&
        newStatus !== "active" &&
        newStatus !== "trialing";
      if (pastDueTooLong) newStatus = "canceled";

      if (newStatus === row.status) continue;

      changes.push({
        user_id: row.user_id,
        email,
        stripe_customer_id: customerId,
        stripe_status: stripeStatus,
        from: row.status,
        to: newStatus,
        grace_expired: pastDueTooLong || undefined,
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

        // Subscription is gone → drop to Free Basic instead of blocking the account.
        if (newStatus === "canceled") {
          await downgradeToBasic(admin, student.auth_user_id, email);
        } else if (["active", "trialing", "past_due"].includes(newStatus)) {
          // Still paying (or in grace) → make sure the paid role/profile state matches.
          await grantPaidRole(admin, student.auth_user_id, "active");
        }

        await admin.from("audit_logs").insert({
          admin_id: actorId ?? "00000000-0000-0000-0000-000000000000",
          target_user_id: row.user_id,
          action: isCron ? "sweep_stripe_access_cron" : "sweep_stripe_access",
          metadata: {
            previous_status: row.status,
            new_status: newStatus,
            stripe_status: stripeStatus,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub?.id || null,
            target_email: email,
            grace_expired: pastDueTooLong,
          },
        });
      }
    }

    // ---------------------------------------------------------------------
    // PASS 2 — ORPHAN ACCOUNTS
    // Profiles still marked access_status='active' that have NO vault_academy
    // student_access row at all. These were invisible to pass 1, so a churned
    // member could keep member-level visibility forever. We only revoke when we
    // are certain: no membership row, no active Stripe sub, not whitelisted,
    // not staff, not protected.
    // ---------------------------------------------------------------------
    let orphansScanned = 0;
    let orphansDowngraded = 0;
    let orphansSkipped = 0;

    const { data: activeProfiles } = await admin
      .from("profiles")
      .select("user_id, email")
      .eq("access_status", "active")
      .limit(limit);

    const candidates = (activeProfiles || []).filter((p) => !!p.user_id);

    if (candidates.length > 0) {
      const ids = candidates.map((p) => p.user_id as string);

      // CRITICAL: student_access.user_id references students.id, NOT the auth user id.
      // Map auth uid -> students.id first, otherwise every paying member looks like an orphan.
      const { data: studentRows } = await admin
        .from("students")
        .select("id, auth_user_id")
        .in("auth_user_id", ids);
      const authToStudent = new Map<string, string>(
        (studentRows || [])
          .filter((s) => !!s.auth_user_id)
          .map((s) => [s.auth_user_id as string, s.id as string]),
      );
      const studentRowIds = Array.from(authToStudent.values());

      const [{ data: accessAll }, { data: whitelist }, { data: staffRoles }] = await Promise.all([
        studentRowIds.length
          ? admin.from("student_access").select("user_id, status, is_lifetime").in("user_id", studentRowIds)
          : Promise.resolve({ data: [] as { user_id: string }[] }),
        admin.from("allowed_signups").select("email"),
        admin.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);

      const accessStudentIds = new Set((accessAll || []).map((r) => r.user_id));
      const whitelisted = new Set(
        (whitelist || []).map((w) => (w.email || "").trim().toLowerCase()).filter(Boolean),
      );
      const staff = new Set(
        (staffRoles || [])
          .filter((r) => ["operator", "vault_os_owner", "admin"].includes(String(r.role)))
          .map((r) => r.user_id),
      );

      for (const p of candidates) {
        const uid = p.user_id as string;
        const email = (p.email || "").trim().toLowerCase() || null;

        const studentId = authToStudent.get(uid);
        if (studentId && accessStudentIds.has(studentId)) continue; // handled by pass 1

        orphansScanned++;

        if (staff.has(uid) || (email && (protectedEmails.has(email) || whitelisted.has(email)))) {
          orphansSkipped++;
          changes.push({ user_id: uid, email, result: "orphan_skipped_protected" });
          continue;
        }

        if (!email) {
          orphansSkipped++;
          changes.push({ user_id: uid, email, result: "orphan_skipped_no_email" });
          continue;
        }

        // Does Stripe know them with a live subscription?
        let stripeOk = false;
        let lookupFailed = false;
        try {
          const list = await stripe.customers.list({ email, limit: 3 });
          for (const c of list.data) {
            const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 5 });
            if (subs.data.some((s) => ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(s.status))) {
              stripeOk = true;
              break;
            }
          }
        } catch (e) {
          lookupFailed = true;
          log("orphan_stripe_lookup_failed", { email, error: (e as Error).message });
        }

        if (lookupFailed || stripeOk) {
          // SAFETY: never revoke on an API error or when a live sub exists.
          orphansSkipped++;
          changes.push({
            user_id: uid, email,
            result: lookupFailed ? "orphan_stripe_lookup_error" : "orphan_has_stripe_sub",
          });
          continue;
        }

        changes.push({ user_id: uid, email, from: "active", to: "basic_tier", result: "orphan_downgraded_to_basic" });

        if (!dryRun) {
          // Downgrade, never revoke. They keep the app + free community/content.
          await downgradeToBasic(admin, uid, email);
          await admin.from("audit_logs").insert({
            admin_id: actorId ?? "00000000-0000-0000-0000-000000000000",
            target_user_id: uid,
            action: isCron ? "sweep_orphan_access_cron" : "sweep_orphan_access",
            metadata: { previous_status: "active", new_status: "basic_tier", target_email: email, reason: "no_membership_row_and_no_stripe_subscription" },
          });
          orphansDowngraded++;
        }
      }
    }

    log("DONE", {
      scanned: access.length, updated, noStripe, skippedProtected, skippedLookupFailed,
      orphansScanned, orphansDowngraded, orphansSkipped, dryRun,
    });


    return new Response(
      JSON.stringify({
        scanned: access.length, updated, no_stripe: noStripe,
        skipped_protected: skippedProtected, skipped_lookup_failed: skippedLookupFailed,
        orphans_scanned: orphansScanned, orphans_downgraded: orphansDowngraded, orphans_skipped: orphansSkipped,
        dry_run: dryRun, changes,
      }),
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
