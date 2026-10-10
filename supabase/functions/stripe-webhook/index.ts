import { fulfillReturnCheckout, syncReturnSubscription } from "../_shared/returnFulfillment.ts";
import { fulfillGhlInvoice, ghlConfig, GHL_SOURCE } from "../_shared/ghlInvoiceFulfillment.ts";
import { attemptImmediateOnboarding, onboardingEnv, supabaseOutboxStore } from "../_shared/returnOnboarding.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { invoiceSubscriptionId, stripeAccessStatus } from "../_shared/membershipValidation.ts";
import { enqueueRecovery, shouldEnqueueClear, shouldEnqueueRecovery } from "../_shared/paymentRecovery.ts";
import { type AccessRow, unknownPriceReconcileTarget } from "../_shared/legacyReconcile.ts";
import {
  LEGACY_PRICE_MAP,
  resolvePlanForPrice,
  revokePaidRole,
  syncRolesFromStatus,
} from "../_shared/vaultAccess.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (traceId: string, step: string, details?: unknown) => {
  console.log(`[stripe-webhook][${traceId}] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = crypto.randomUUID().slice(0, 8);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // ─── 1. Verify Stripe signature ───
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!sig) throw new Error("Missing stripe-signature header");

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      log(traceId, "SIGNATURE_FAILED", { error: (err as Error).message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders });
    }

    log(traceId, "EVENT_RECEIVED", { type: event.type, id: event.id });

    // Production fail-closed guard: test-mode/sandbox events must never reach
    // entitlement, event-log, or onboarding-outbox writes on the live backend.
    if (event.livemode !== true) {
      log(traceId, "IGNORED_NON_LIVE_EVENT", { type: event.type, id: event.id });
      return new Response(JSON.stringify({ received: true, ignored: "non_live_event" }), { status: 200, headers: corsHeaders });
    }

    // ─── 2. Idempotency check ───
    const { data: existing } = await supabase
      .from("stripe_webhook_events")
      .select("id, status")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existing && ["processed", "ignored"].includes(existing.status)) {
      log(traceId, "DUPLICATE_EVENT", { existingId: existing.id, status: existing.status });
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers: corsHeaders });
    }

    // ─── 3. Log event as received ───
    const eventRow: Record<string, unknown> = {
      stripe_event_id: event.id,
      event_type: event.type,
      status: "received",
      payload_json: event,
      trace_id: traceId,
    };

    // Extract common fields from event data
    const obj = event.data.object as Record<string, unknown>;
    if (obj.customer_email || obj.email) eventRow.email = (obj.customer_email || obj.email) as string;
    if (obj.customer) eventRow.stripe_customer_id = obj.customer as string;
    if (obj.subscription) eventRow.stripe_subscription_id = obj.subscription as string;
    if (obj.id && event.type.startsWith("checkout")) eventRow.checkout_session_id = obj.id as string;
    if (obj.amount_total) { eventRow.amount = obj.amount_total as number; eventRow.currency = obj.currency as string; }

    // Failed deliveries must be retried, not permanently marked as duplicates.
    const { data: logRow, error: logError } = existing
      ? await supabase.from("stripe_webhook_events").update({status:"received", error_message:null}).eq("id", existing.id).select("id").single()
      : await supabase.from("stripe_webhook_events").insert(eventRow).select("id").single();
    if (logError || !logRow) throw new Error("Unable to record webhook delivery");
    const logId = logRow?.id;

    // ─── 4. Route by event type ───
    const supportedEvents = [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "invoice.paid",
      "invoice.created",
      "invoice.payment_failed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ];

    if (!supportedEvents.includes(event.type)) {
      log(traceId, "IGNORED_EVENT_TYPE", { type: event.type });
      await supabase.from("stripe_webhook_events").update({ status: "ignored", processed_at: new Date().toISOString() }).eq("id", logId);
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
    }

    try {
      await processEvent(event, traceId, stripe, supabase);
      await supabase.from("stripe_webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", logId);
      log(traceId, "PROCESSED_OK");
    } catch (err) {
      const msg = (err as Error).message;
      log(traceId, "PROCESSING_ERROR", { error: msg });
      await supabase.from("stripe_webhook_events").update({ status: "failed", error_message: msg, processed_at: new Date().toISOString() }).eq("id", logId);
      return new Response(JSON.stringify({ error: "Membership update failed; retry required" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    log(traceId, "FATAL_ERROR", { error: (err as Error).message });
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});

// ═══════════════════════════════════════════
// CENTRALIZED EVENT PROCESSOR
// ═══════════════════════════════════════════
async function processEvent(
  event: Stripe.Event,
  traceId: string,
  stripe: Stripe,
  supabase: SupabaseClient
) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, traceId, stripe, supabase);
      break;
    case "invoice.created": {
      const invoice = event.data.object as Stripe.Invoice;
      const id = invoiceSubscriptionId(invoice);
      if (id) {
        const sub = await stripe.subscriptions.retrieve(id);
        if (invoice.status === "draft" && sub.metadata?.vault_campaign === "vault_return_199_30d" && sub.items.data[0]?.price.id === Deno.env.get("STRIPE_VAULT_OS_MONTHLY_PRICE_ID")) {
          // Renewal invoices only: the first invoice is already finalized at checkout,
          // so its instructions come from the subscription description instead.
          // A footer failure must never fail the payment event.
          await stripe.invoices.update(invoice.id!, { footer: "Access Vault OS: https://member.vaulttradingacademy.com/activate-return — use the email entered at checkout. Verify your email to connect your membership, then download Vault OS for iPhone or Android. Help: vault@vaulttradingacademy.com. No second payment is needed." }).catch((e: unknown) => log(traceId, "RETURN_FOOTER_SKIPPED", { invoiceId: invoice.id, error: String((e as Error)?.message ?? e).slice(0, 120) }));
        }
      }
      break;
    }
    case "invoice.paid": {
      // Access returns only if the CURRENT subscription is active again.
      const invoice = event.data.object as Stripe.Invoice;
      // Native GHL $1.99 initial invoice (flag-gated, off by default). Rejections never grant.
      const ghl = await fulfillGhlInvoice(invoice, stripe, supabase, ghlConfig((k) => Deno.env.get(k)), async (subId) => {
        const outcome = await attemptImmediateOnboarding(supabaseOutboxStore(supabase), subId, onboardingEnv((k) => Deno.env.get(k)));
        log(traceId, "GHL_ONBOARDING_IMMEDIATE", { outcome });
      }, (reason) => log(traceId, "GHL_INVOICE_REJECTED", { invoiceId: invoice.id, reason }));
      if (ghl !== "not_applicable") log(traceId, "GHL_INVOICE", { invoiceId: invoice.id, outcome: ghl });
      if (ghl === "rejected") break;
      const current = await handleInvoicePaid(invoice, traceId, stripe, supabase);
      if (current && invoice.id && invoice.status === "paid" && shouldEnqueueClear(event.type, current.status)) {
        const target = await recoveryRecipient(supabase, current);
        if (target) await enqueueRecovery(supabase, { invoiceId: invoice.id, subscriptionId: current.id, kind: "clear", ...target });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const current = await handleInvoicePaid(invoice, traceId, stripe, supabase);
      // Replay/out-of-order safe: decided from the re-read subscription, deduped by invoice id.
      if (current && invoice.id && shouldEnqueueRecovery(event.type, current.status)) {
        const target = await recoveryRecipient(supabase, current);
        if (target) {
          await enqueueRecovery(supabase, { invoiceId: invoice.id, subscriptionId: current.id, ...target });
          log(traceId, "PAYMENT_RECOVERY_ENQUEUED", { invoiceId: invoice.id });
        } else log(traceId, "PAYMENT_RECOVERY_NO_ACCOUNT", { subId: current.id });
      }
      break;
    }
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(await stripe.subscriptions.retrieve((event.data.object as Stripe.Subscription).id), traceId, stripe, supabase);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionUpdated(await stripe.subscriptions.retrieve((event.data.object as Stripe.Subscription).id), traceId, stripe, supabase);
      break;
  }
}

// ═══════════════════════════════════════════
// USER MATCHING + ACCESS PROVISIONING
// ═══════════════════════════════════════════

// Match order: metadata.internal_user_id → stripe_customer_id → email → create new
async function matchOrCreateStudent(
  opts: {
    email: string;
    stripeCustomerId: string | null;
    internalUserId?: string | null;
    fullName?: string | null;
  },
  traceId: string,
  supabase: SupabaseClient
): Promise<{ id: string; auth_user_id: string | null; email: string }> {
  const normalizedEmail = opts.email.toLowerCase().trim();
  log(traceId, "MATCH_USER", { email: normalizedEmail, stripeCustomerId: opts.stripeCustomerId, internalUserId: opts.internalUserId });

  // 1. Try by internal user ID (auth user ID)
  if (opts.internalUserId) {
    const { data } = await supabase.from("students").select("id, auth_user_id").eq("auth_user_id", opts.internalUserId).maybeSingle();
    if (data) {
      log(traceId, "MATCHED_BY_AUTH_USER_ID", { studentId: data.id });
      // Backfill stripe_customer_id if needed
      if (opts.stripeCustomerId) {
        await supabase.from("students").update({ stripe_customer_id: opts.stripeCustomerId, updated_at: new Date().toISOString() }).eq("id", data.id);
      }
      return { id: data.id, auth_user_id: (data.auth_user_id as string) ?? opts.internalUserId, email: normalizedEmail };
    }
  }

  // 2. Try by stripe_customer_id
  if (opts.stripeCustomerId) {
    const { data } = await supabase.from("students").select("id, auth_user_id").eq("stripe_customer_id", opts.stripeCustomerId).maybeSingle();
    if (data) {
      log(traceId, "MATCHED_BY_STRIPE_CUSTOMER", { studentId: data.id });
      return { id: data.id, auth_user_id: (data.auth_user_id as string) ?? null, email: normalizedEmail };
    }
  }

  // 3. Try by email
  const { data: emailMatch } = await supabase.from("students").select("id, auth_user_id").eq("email", normalizedEmail).maybeSingle();
  if (emailMatch) {
    log(traceId, "MATCHED_BY_EMAIL", { studentId: emailMatch.id });
    // Backfill stripe_customer_id
    if (opts.stripeCustomerId) {
      await supabase.from("students").update({ stripe_customer_id: opts.stripeCustomerId, updated_at: new Date().toISOString() }).eq("id", emailMatch.id);
    }
    return { id: emailMatch.id, auth_user_id: (emailMatch.auth_user_id as string) ?? null, email: normalizedEmail };
  }

  // 4. Create new student
  log(traceId, "CREATING_NEW_STUDENT", { email: normalizedEmail });
  const { data: newStudent, error } = await supabase.from("students").insert({
    email: normalizedEmail,
    full_name: opts.fullName || null,
    stripe_customer_id: opts.stripeCustomerId,
    auth_user_id: opts.internalUserId || null,
  }).select("id, auth_user_id").single();

  if (error) throw new Error(`Failed to create student: ${error.message}`);
  log(traceId, "STUDENT_CREATED", { studentId: newStudent.id });
  return { id: newStudent.id, auth_user_id: (newStudent.auth_user_id as string) ?? opts.internalUserId ?? null, email: normalizedEmail };
}

// Upsert access record
async function upsertAccess(
  opts: {
    studentId: string;
    productKey: string;
    tier: string;
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId?: string | null;
    stripeCheckoutSessionId?: string | null;
    stripePriceId?: string | null;
    authUserId?: string | null;
    email?: string | null;
  },
  traceId: string,
  supabase: SupabaseClient
) {
  const now = new Date().toISOString();
  log(traceId, "UPSERT_ACCESS", { studentId: opts.studentId, productKey: opts.productKey, status: opts.status });

  const accessData: Record<string, unknown> = {
    user_id: opts.studentId,
    product_key: opts.productKey,
    tier: opts.tier,
    status: opts.status,
    stripe_customer_id: opts.stripeCustomerId,
    last_synced_at: now,
    updated_at: now,
  };
  if (opts.stripeSubscriptionId) accessData.stripe_subscription_id = opts.stripeSubscriptionId;
  if (opts.stripeCheckoutSessionId) accessData.stripe_checkout_session_id = opts.stripeCheckoutSessionId;
  if (opts.stripePriceId) accessData.stripe_price_id = opts.stripePriceId;

  if (opts.status === "active") {
    accessData.access_granted_at = now;
    accessData.access_ended_at = null;
  } else if (opts.status === "canceled" || opts.status === "revoked") {
    accessData.access_ended_at = now;
  }

  // Upsert on (user_id, product_key) unique constraint
  const { error } = await supabase.from("student_access").upsert(accessData, {
    onConflict: "user_id,product_key",
  });

  if (error) throw new Error(`Failed to upsert access: ${error.message}`);
  log(traceId, "ACCESS_UPSERTED", { status: opts.status });

  // Keep app-facing entitlement state (user_roles + profiles) in sync with billing.
  let authUserId = opts.authUserId ?? null;
  let email = opts.email ?? null;
  if (!authUserId) {
    const { data: student } = await supabase
      .from("students")
      .select("auth_user_id, email")
      .eq("id", opts.studentId)
      .maybeSingle();
    authUserId = (student?.auth_user_id as string) ?? null;
    email = email ?? ((student?.email as string) ?? null);
  }
  await syncRolesFromStatus(supabase, {
    authUserId,
    studentId: opts.studentId,
    email,
    status: opts.status,
    productKey: opts.productKey,
  });
  log(traceId, "ROLES_SYNCED", { authUserId, status: opts.status });
}

// Resolve price to plan mapping (current Vault OS price + legacy prices)
function resolvePlan(priceId: string | null | undefined, traceId: string): { product_key: string; tier: string } {
  if (!priceId) {
    throw new Error("A verified Stripe price is required for Full Access");
  }
  const plan = resolvePlanForPrice(priceId);
  if (!plan) {
    log(traceId, "UNKNOWN_PRICE_ID", { priceId, knownLegacy: Object.keys(LEGACY_PRICE_MAP) });
    throw new Error(`Unknown Stripe price ID: ${priceId}. Set STRIPE_VAULT_OS_MONTHLY_PRICE_ID or add it as a legacy price.`);
  }
  return { product_key: plan.product_key, tier: plan.tier };
}

// ═══════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  traceId: string,
  stripe: Stripe,
  supabase: SupabaseClient
) {
  if (await fulfillReturnCheckout(session, stripe, supabase, {
    paymentLinkId: Deno.env.get('STRIPE_VAULT_RETURN_PAYMENT_LINK_ID') || '',
    monthlyPriceId: Deno.env.get('STRIPE_VAULT_OS_MONTHLY_PRICE_ID') || '',
    introPriceId: Deno.env.get('STRIPE_VAULT_RETURN_INTRO_PRICE_ID') || '',
  }, async (subId) => {
    const outcome = await attemptImmediateOnboarding(supabaseOutboxStore(supabase), subId, onboardingEnv((k) => Deno.env.get(k)));
    log(traceId, "RETURN_ONBOARDING_IMMEDIATE", { outcome });
  })) return;
  log(traceId, "CHECKOUT_COMPLETED", { sessionId: session.id, mode: session.mode });
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    log(traceId, "AWAITING_PAYMENT", { sessionId: session.id });
    return;
  }

  const email = session.customer_email || session.customer_details?.email;
  if (!email) throw new Error("No email in checkout session");

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
  const metadata = session.metadata || {};

  // Get price ID from line items
  let priceId: string | null = null;
  if (session.line_items?.data?.[0]?.price?.id) {
    priceId = session.line_items.data[0].price.id;
  } else {
    // Fetch line items from Stripe
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    priceId = lineItems.data[0]?.price?.id || null;
  }

  resolvePlan(priceId || metadata.app_price_id, traceId);
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;
  if (!subscriptionId) throw new Error("A subscription is required for Full Access");

  await matchOrCreateStudent({
    email,
    stripeCustomerId: customerId,
    internalUserId: metadata.internal_user_id,
    fullName: session.customer_details?.name,
  }, traceId, supabase);

  await handleSubscriptionUpdated(await stripe.subscriptions.retrieve(subscriptionId), traceId, stripe, supabase);
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  traceId: string,
  stripe: Stripe,
  supabase: SupabaseClient
): Promise<Stripe.Subscription | null> {
  log(traceId, "INVOICE_RECONCILE", { invoiceId: invoice.id });
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return null;
  // A delayed invoice event must not reactivate an already-canceled subscription.
  const current = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpdated(current, traceId, stripe, supabase);
  return current;
}

/** The bound app account (and its own sign-in email) for a past-due subscription. */
async function recoveryRecipient(supabase: SupabaseClient, sub: Stripe.Subscription): Promise<{ authUserId: string; email: string } | null> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  let authUserId: string | null = null;
  const ret = await supabase.from("vault_return_memberships").select("auth_user_id").eq("stripe_subscription_id", sub.id).maybeSingle();
  if (ret.error) throw ret.error;
  authUserId = (ret.data?.auth_user_id as string) ?? null;
  if (!authUserId && customerId) {
    const st = await supabase.from("students").select("auth_user_id").eq("stripe_customer_id", customerId).not("auth_user_id", "is", null).limit(1);
    if (st.error) throw st.error;
    authUserId = (st.data?.[0]?.auth_user_id as string) ?? null;
  }
  if (!authUserId) return null;
  const { data, error } = await supabase.auth.admin.getUserById(authUserId);
  if (error) throw error;
  const email = data.user?.email;
  return email ? { authUserId, email } : null;
}


async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  traceId: string,
  stripe: Stripe,
  supabase: SupabaseClient
) {
  const bound = await syncReturnSubscription(subscription, supabase, (authUserId, email) => revokePaidRole(supabase, { authUserId, email }));
  log(traceId, "SUBSCRIPTION_UPDATED", { subId: subscription.id, status: subscription.status });
  // GHL native memberships are governed only by their verified paid-intro row;
  // never route them through the generic price-based grant.
  if (bound?.source === GHL_SOURCE) return;

  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
  if (!customerId) throw new Error("No customer on subscription");

  // Unknown price: status-only reconcile of an EXISTING bound row, never a new paid mapping.
  if (!resolvePlanForPrice(subscription.items?.data?.[0]?.price?.id)) {
    const { data: rows, error } = await supabase.from("student_access")
      .select("user_id, product_key, tier, status, stripe_subscription_id, stripe_customer_id")
      .eq("stripe_subscription_id", subscription.id);
    if (error) throw error;
    const target = unknownPriceReconcileTarget((rows ?? []) as AccessRow[], subscription as never);
    if (!target) return void resolvePlan(subscription.items?.data?.[0]?.price?.id, traceId); // throws: unknown + unbound
    log(traceId, "UNKNOWN_PRICE_STATUS_RECONCILE", { subId: subscription.id, status: subscription.status });
    await upsertAccess({
      studentId: target.user_id,
      productKey: target.product_key,
      tier: target.tier,
      status: stripeAccessStatus(subscription.status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
    }, traceId, supabase);
    return;
  }

  if (subscription.status !== "active") {
    const originalPlan = resolvePlan(subscription.items?.data?.[0]?.price?.id, traceId);
    for await (const candidate of stripe.subscriptions.list({ customer: customerId, status: "active", limit: 100 })) {
      if (resolvePlanForPrice(candidate.items.data[0]?.price?.id)?.product_key === originalPlan.product_key) {
        subscription = candidate;
        break;
      }
    }
  }

  // Get email from Stripe customer
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) throw new Error("Customer deleted");
  const email = customer.email;
  if (!email) throw new Error("No email on customer");

  const priceId = subscription.items?.data?.[0]?.price?.id || null;
  const plan = resolvePlan(priceId, traceId);

  // Map Stripe sub status to internal status
  const internalStatus = stripeAccessStatus(subscription.status);

  const student = await matchOrCreateStudent({
    email,
    stripeCustomerId: customerId,
  }, traceId, supabase);

  await upsertAccess({
    studentId: student.id,
    authUserId: student.auth_user_id,
    email: student.email,
    productKey: plan.product_key,
    tier: plan.tier,
    status: internalStatus,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
  }, traceId, supabase);
}
