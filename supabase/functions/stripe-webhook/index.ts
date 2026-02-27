import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

// ─── Centralized Stripe Price → Internal Plan Mapping ───
const PRICE_MAP: Record<string, { product_key: string; tier: string; billing_cycle: string }> = {
  // Vault Academy Elite — $200/mo (main active price)
  "price_1SB2aaAMsd1FtcvL44ONekRC": {
    product_key: "vault_academy",
    tier: "elite_v1",
    billing_cycle: "monthly",
  },
  // Vault Academy Elite — $200/mo (alt prices for same product)
  "price_1SB2YsAMsd1FtcvLHfcvmDCr": {
    product_key: "vault_academy",
    tier: "elite_v1",
    billing_cycle: "monthly",
  },
  "price_1SB2VTAMsd1FtcvLjvrGfpm6": {
    product_key: "vault_academy",
    tier: "elite_v1",
    billing_cycle: "monthly",
  },
};

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

    // ─── 2. Idempotency check ───
    const { data: existing } = await supabase
      .from("stripe_webhook_events")
      .select("id, status")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existing) {
      log(traceId, "DUPLICATE_EVENT", { existingId: existing.id, status: existing.status });
      // Mark duplicate
      await supabase
        .from("stripe_webhook_events")
        .update({ status: "duplicate" })
        .eq("id", existing.id);
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

    const { data: logRow } = await supabase.from("stripe_webhook_events").insert(eventRow).select("id").single();
    const logId = logRow?.id;

    // ─── 4. Route by event type ───
    const supportedEvents = [
      "checkout.session.completed",
      "invoice.paid",
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
  supabase: ReturnType<typeof createClient>
) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, traceId, stripe, supabase);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice, traceId, stripe, supabase);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, traceId, supabase);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, traceId, stripe, supabase);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, traceId, supabase);
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
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const normalizedEmail = opts.email.toLowerCase().trim();
  log(traceId, "MATCH_USER", { email: normalizedEmail, stripeCustomerId: opts.stripeCustomerId, internalUserId: opts.internalUserId });

  // 1. Try by internal user ID (auth user ID)
  if (opts.internalUserId) {
    const { data } = await supabase.from("students").select("id").eq("auth_user_id", opts.internalUserId).maybeSingle();
    if (data) {
      log(traceId, "MATCHED_BY_AUTH_USER_ID", { studentId: data.id });
      // Backfill stripe_customer_id if needed
      if (opts.stripeCustomerId) {
        await supabase.from("students").update({ stripe_customer_id: opts.stripeCustomerId, updated_at: new Date().toISOString() }).eq("id", data.id);
      }
      return data.id;
    }
  }

  // 2. Try by stripe_customer_id
  if (opts.stripeCustomerId) {
    const { data } = await supabase.from("students").select("id").eq("stripe_customer_id", opts.stripeCustomerId).maybeSingle();
    if (data) {
      log(traceId, "MATCHED_BY_STRIPE_CUSTOMER", { studentId: data.id });
      return data.id;
    }
  }

  // 3. Try by email
  const { data: emailMatch } = await supabase.from("students").select("id").eq("email", normalizedEmail).maybeSingle();
  if (emailMatch) {
    log(traceId, "MATCHED_BY_EMAIL", { studentId: emailMatch.id });
    // Backfill stripe_customer_id
    if (opts.stripeCustomerId) {
      await supabase.from("students").update({ stripe_customer_id: opts.stripeCustomerId, updated_at: new Date().toISOString() }).eq("id", emailMatch.id);
    }
    return emailMatch.id;
  }

  // 4. Create new student
  log(traceId, "CREATING_NEW_STUDENT", { email: normalizedEmail });
  const { data: newStudent, error } = await supabase.from("students").insert({
    email: normalizedEmail,
    full_name: opts.fullName || null,
    stripe_customer_id: opts.stripeCustomerId,
    auth_user_id: opts.internalUserId || null,
  }).select("id").single();

  if (error) throw new Error(`Failed to create student: ${error.message}`);
  log(traceId, "STUDENT_CREATED", { studentId: newStudent.id });
  return newStudent.id;
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
  },
  traceId: string,
  supabase: ReturnType<typeof createClient>
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
}

// Resolve price to plan mapping
function resolvePlan(priceId: string | null | undefined, traceId: string): { product_key: string; tier: string } {
  if (!priceId) {
    log(traceId, "NO_PRICE_ID_DEFAULTING");
    return { product_key: "vault_academy", tier: "elite_v1" };
  }
  const plan = PRICE_MAP[priceId];
  if (!plan) {
    log(traceId, "UNKNOWN_PRICE_ID", { priceId });
    throw new Error(`Unknown Stripe price ID: ${priceId}. Add it to the PRICE_MAP.`);
  }
  return plan;
}

// ═══════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  traceId: string,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>
) {
  log(traceId, "CHECKOUT_COMPLETED", { sessionId: session.id, mode: session.mode });

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

  const plan = resolvePlan(priceId || metadata.app_price_id, traceId);
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null;

  const studentId = await matchOrCreateStudent({
    email,
    stripeCustomerId: customerId,
    internalUserId: metadata.internal_user_id,
    fullName: session.customer_details?.name,
  }, traceId, supabase);

  await upsertAccess({
    studentId,
    productKey: plan.product_key,
    tier: plan.tier,
    status: "active",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeCheckoutSessionId: session.id,
    stripePriceId: priceId,
  }, traceId, supabase);
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  traceId: string,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>
) {
  log(traceId, "INVOICE_PAID", { invoiceId: invoice.id });

  const email = invoice.customer_email;
  if (!email) throw new Error("No email in invoice");

  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  const priceId = invoice.lines?.data?.[0]?.price?.id || null;

  const plan = resolvePlan(priceId, traceId);

  const studentId = await matchOrCreateStudent({
    email,
    stripeCustomerId: customerId,
  }, traceId, supabase);

  await upsertAccess({
    studentId,
    productKey: plan.product_key,
    tier: plan.tier,
    status: "active",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
  }, traceId, supabase);
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  traceId: string,
  supabase: ReturnType<typeof createClient>
) {
  log(traceId, "INVOICE_PAYMENT_FAILED", { invoiceId: invoice.id });

  const email = invoice.customer_email;
  if (!email) return;

  const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
  const priceId = invoice.lines?.data?.[0]?.price?.id || null;

  let plan: { product_key: string; tier: string };
  try {
    plan = resolvePlan(priceId, traceId);
  } catch {
    plan = { product_key: "vault_academy", tier: "elite_v1" };
  }

  const studentId = await matchOrCreateStudent({
    email,
    stripeCustomerId: customerId,
  }, traceId, supabase);

  await upsertAccess({
    studentId,
    productKey: plan.product_key,
    tier: plan.tier,
    status: "past_due",
    stripeCustomerId: customerId,
    stripePriceId: priceId,
  }, traceId, supabase);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  traceId: string,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>
) {
  log(traceId, "SUBSCRIPTION_UPDATED", { subId: subscription.id, status: subscription.status });

  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
  if (!customerId) throw new Error("No customer on subscription");

  // Get email from Stripe customer
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) throw new Error("Customer deleted");
  const email = customer.email;
  if (!email) throw new Error("No email on customer");

  const priceId = subscription.items?.data?.[0]?.price?.id || null;
  const plan = resolvePlan(priceId, traceId);

  // Map Stripe sub status to internal status
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
  const internalStatus = statusMap[subscription.status] || "active";

  const studentId = await matchOrCreateStudent({
    email,
    stripeCustomerId: customerId,
  }, traceId, supabase);

  await upsertAccess({
    studentId,
    productKey: plan.product_key,
    tier: plan.tier,
    status: internalStatus,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
  }, traceId, supabase);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  traceId: string,
  supabase: ReturnType<typeof createClient>
) {
  log(traceId, "SUBSCRIPTION_DELETED", { subId: subscription.id });

  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
  if (!customerId) return;

  // Find student by stripe_customer_id and revoke access
  const { data: student } = await supabase.from("students").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  if (!student) {
    log(traceId, "NO_STUDENT_FOR_DELETED_SUB", { customerId });
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id || null;
  let plan: { product_key: string; tier: string };
  try {
    plan = resolvePlan(priceId, traceId);
  } catch {
    plan = { product_key: "vault_academy", tier: "elite_v1" };
  }

  await upsertAccess({
    studentId: student.id,
    productKey: plan.product_key,
    tier: plan.tier,
    status: "canceled",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
  }, traceId, supabase);
}
