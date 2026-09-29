import { cachedProviderToken } from "../_shared/providerTokenCache.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "https://esm.sh/jose@5.9.2";
import webPush from "npm:web-push@3.6.7";
import { parseWebSubscription } from "../_shared/webPushPolicy.ts";
import { deliverPushJob } from "../_shared/pushDelivery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-push-secret",
};

const GOOGLE_OAUTH_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

type NotificationRow = {
  id: string;
  user_id: string | null;
  type: string;
  title: string | null;
  body: string | null;
  link_path?: string | null;
  source_message_id?: string | null;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function defaultLinkPath(type: string) {
  switch (type) {
    case "live_now":
      return "/academy/live";
    case "announcement":
      return "/academy/room/announcements";
    case "new_module":
      return "/academy/learn";
    default:
      return "/academy/community";
  }
}

function defaultBody(type: string) {
  switch (type) {
    case "live_now":
      return "Tap to join the live session now.";
    case "announcement":
      return "Open the announcement for details.";
    case "new_module":
      return "Open Academy to start the new lesson.";
    case "motivation":
      return "Open Academy to view your update.";
    default:
      return "";
  }
}

function notificationThreadId(type: string) {
  switch (type) {
    case "chat_message":
      return "chat-trade-floor";
    case "mention":
      return "community-mentions";
    case "rz_message":
      return "ceo-broadcasts";
    case "live_now":
      return "live-room";
    case "announcement":
      return "announcements";
    case "new_module":
      return "learning";
    case "motivation":
      return "motivation";
    default:
      return "academy";
  }
}

function notificationCategory(type: string) {
  switch (type) {
    case "chat_message":
      return "COMMUNITY_REPLY";
    case "mention":
      return "COMMUNITY_REPLY";
    case "rz_message":
      return "CEO_ALERT";
    case "live_now":
      return "LIVE_NOW";
    case "announcement":
      return "ANNOUNCEMENT";
    case "new_module":
      return "LEARNING";
    case "motivation":
      return "MOTIVATION";
    default:
      return "GENERAL";
  }
}

function normalizeNotification(notif: NotificationRow) {
  return {
    id: notif.id,
    type: notif.type,
    title: (notif.title || "VaultAcademy").trim(),
    body: (notif.body || defaultBody(notif.type)).trim(),
    linkPath: notif.link_path || defaultLinkPath(notif.type),
    threadId: notificationThreadId(notif.type),
    category: notificationCategory(notif.type),
  };
}

// Apple requires provider-token reuse (refresh between 20 and 60 minutes).
const createApnsJwt = cachedProviderToken(createApnsJwtUncached, 45 * 60_000);
const firebaseAccessToken = cachedProviderToken(async () => {
  const account = getFirebaseServiceAccount();
  return account ? createFirebaseAccessToken(account) : null;
}, 45 * 60_000);

async function createApnsJwtUncached() {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const privateKey = Deno.env.get("APNS_PRIVATE_KEY");
  if (!keyId || !teamId || !privateKey) return null;
  const key = await importPKCS8(privateKey.replace(/\\n/g, "\n"), "ES256");
  return await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

function getFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  try {
    const account = JSON.parse(raw) as Partial<FirebaseServiceAccount>;
    if (!account.project_id || !account.client_email || !account.private_key) return null;
    return account as FirebaseServiceAccount;
  } catch {
    return null;
  }
}

async function createFirebaseAccessToken(account: FirebaseServiceAccount) {
  const key = await importPKCS8(account.private_key.replace(/\\n/g, "\n"), "RS256");
  const assertion = await new SignJWT({ scope: FCM_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setAudience(GOOGLE_OAUTH_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const response = await fetch(GOOGLE_OAUTH_URL, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google OAuth failed with status ${response.status}`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Google OAuth response did not include an access token");
  return body.access_token;
}

async function sendFcm(tokens: string[], notif: ReturnType<typeof normalizeNotification>) {
  if (tokens.length === 0) return { sent: 0, invalidTokens: [] as string[], errors: [] as string[] };
  const account = getFirebaseServiceAccount();
  if (!account) {
    return { sent: 0, invalidTokens: [] as string[], errors: ["FIREBASE_SERVICE_ACCOUNT_JSON not set"] };
  }
  const accessToken = await firebaseAccessToken();
  if (!accessToken) return { sent: 0, invalidTokens: [] as string[], errors: ["Firebase credentials unavailable"] };
  const url = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;
  let sent = 0;
  const invalidTokens: string[] = [];
  const errors: string[] = [];
  for (const token of tokens) {
    const response = await fetch(url, {
      method: "POST",
    signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: notif.title, body: notif.body },
          data: {
            notification_id: notif.id,
            type: notif.type,
            category: notif.category,
            thread_id: notif.threadId,
            link_path: notif.linkPath,
          },
          android: { priority: "HIGH", ttl: "300s", notification: { sound: "default", tag: notif.id } },
        },
      }),
    });
    if (response.ok) {
      sent += 1;
      continue;
    }
    const raw = await response.text();
    if (response.status === 404 || raw.includes("UNREGISTERED")) invalidTokens.push(token);
    console.warn("push_provider_failure", { provider: "fcm", status: response.status });
    errors.push(`FCM request failed with status ${response.status}`);
  }
  return { sent, invalidTokens, errors };
}

async function sendApns(tokens: string[], notif: ReturnType<typeof normalizeNotification>) {
  if (tokens.length === 0) return { sent: 0, invalidTokens: [] as string[], errors: [] as string[] };
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  if (!bundleId) return { sent: 0, invalidTokens: [] as string[], errors: ["APNS_BUNDLE_ID not set"] };
  const jwt = await createApnsJwt();
  if (!jwt) return { sent: 0, invalidTokens: [] as string[], errors: ["APNS credentials missing"] };
  const useSandbox = (Deno.env.get("APNS_USE_SANDBOX") || "").toLowerCase() === "true";
  const primaryHost = useSandbox ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const alternateHost = useSandbox ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";

  const body = JSON.stringify({
    aps: {
      alert: { title: notif.title, body: notif.body },
      sound: "default",
      category: notif.category,
      "thread-id": notif.threadId,
    },
    notification_id: notif.id,
    type: notif.type,
    link_path: notif.linkPath,
  });

  const headers = {
    "apns-topic": bundleId,
    "apns-push-type": "alert",
    "apns-priority": "10",
    authorization: `bearer ${jwt}`,
    "apns-collapse-id": notif.id,
    "apns-expiration": String(Math.floor(Date.now()/1000)+300),
  };

  const postTo = (host: string, token: string) =>
    fetch(`${host}/3/device/${token}`, { method: "POST",
    signal: AbortSignal.timeout(8000), headers, body });

  let sent = 0;
  const invalidTokens: string[] = [];
  const errors: string[] = [];
  for (const token of tokens) {
    let res = await postTo(primaryHost, token);
    let reason = "";
    if (!res.ok) {
      try {
        const txt = await res.clone().text();
        reason = txt ? (JSON.parse(txt)?.reason || "") : "";
      } catch {
        reason = "";
      }
      if (reason === "BadDeviceToken") {
        res = await postTo(alternateHost, token);
        if (!res.ok) {
          try {
            const txt = await res.clone().text();
            reason = txt ? (JSON.parse(txt)?.reason || reason) : reason;
          } catch {
            // Keep the first APNs reason if the retry body is not JSON.
          }
        }
      }
    }
    if (res.ok) {
      sent += 1;
      continue;
    }
    if (reason === "BadDeviceToken" || reason === "Unregistered" || reason === "DeviceTokenNotForTopic") {
      invalidTokens.push(token);
    }
    // Apple reason identifiers only: never log token, payload, or credentials.
    console.warn("push_provider_failure", { provider: "apns", status: res.status, reason: /^[A-Za-z]{1,64}$/.test(reason) ? reason : "Unknown" });
    errors.push(reason || `APNs request failed with status ${res.status}`);
  }
  return { sent, invalidTokens, errors };
}

async function sendWeb(token: string, notif: ReturnType<typeof normalizeNotification>) {
  const subscription = parseWebSubscription(token);
  if (!subscription) return { sent: 0, invalidTokens: [token] };
  const publicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('WEB_PUSH_VAPID_SUBJECT');
  if (!publicKey || !privateKey || !subject) return { sent: 0, invalidTokens: [] };
  try {
    await webPush.sendNotification(subscription, JSON.stringify({ title: notif.title, body: notif.body, notification_id: notif.id, link_path: notif.linkPath }), {
      vapidDetails: { subject, publicKey, privateKey }, TTL: 300, urgency: 'high', timeout: 8000,
    });
    return { sent: 1, invalidTokens: [] };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return { sent: 0, invalidTokens: status === 404 || status === 410 ? [token] : [] };
  }
}

Deno.serve(async (req) => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-push-secret") !== secret) return reply({ error: "Unauthorized" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data: jobs, error } = await admin.rpc("claim_vault_push_jobs", { batch_size: 20 });
    if (error) throw error;
    const totals = { sent: 0, skipped: 0, retry: 0, dead: 0 };
    for (let offset = 0; offset < (jobs || []).length; offset += 10) {
      await Promise.all(jobs.slice(offset, offset + 10).map(async (job: { id: string; notification_id: string; device_id: string; user_id: string; claim_token: string }) => {
        const [{ data: notification, error: notificationError }, { data: device, error: deviceError }] = await Promise.all([
          admin.from("academy_notifications").select("id,user_id,type,title,body,link_path").eq("id", job.notification_id).maybeSingle(),
          admin.from("device_tokens").select("id,user_id,platform,token").eq("id", job.device_id).maybeSingle(),
        ]);
        const outcome = await deliverPushJob({
          eligible: async () => {
            if (notificationError || deviceError) throw new Error("Lookup failed");
            if (!notification || !device || device.user_id !== job.user_id) return false;
            const { data: allowed, error } = await admin.rpc("vault_notification_deliverable", { nid: job.notification_id, uid: job.user_id });
            if (error) throw error;
            return allowed === true;
          },
          send: async () => {
            if (!device || !notification) throw new Error("Missing delivery source");
            const payload = normalizeNotification(notification as NotificationRow);
            const platform = device.platform?.split(":")[0];
            if (platform === "ios") return sendApns([device.token], payload);
            if (platform === "android") return sendFcm([device.token], payload);
            if (platform === "web") return sendWeb(device.token, payload);
            return { sent: 0, invalidTokens: [device.token] };
          },
          removeInvalid: async () => {
            if (!device) return;
            // Retain the ledger, but remove the token so it is never queued again.
            const { error } = await admin.from("device_tokens").update({ token: "invalid:" + device.id, platform: "invalid" }).eq("id", device.id).eq("token", device.token);
            if (error) throw error;
          },
          finish: async (outcome) => {
            const { data: acknowledged, error } = await admin.rpc("finish_vault_push_job", { job_id: job.id, lease_token: job.claim_token, outcome });
            if (error || !acknowledged) throw new Error("Delivery acknowledgement failed");
          },
        });
        totals[outcome]++;
      }));
    }
    // Drain a backlog without depending on any member keeping the app open.
    if ((jobs || []).length) await admin.rpc("wake_vault_push");
    return reply({ ok: true, ...totals });
  } catch {
    return reply({ error: "Delivery unavailable; durable jobs retained for retry" }, 503);
  }
});
