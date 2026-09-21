import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "https://esm.sh/jose@5.9.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-push-secret",
};

const GOOGLE_OAUTH_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const PUSHABLE_TYPES = new Set(["mention", "rz_message", "live_now", "announcement", "new_module", "motivation"]);

type NotificationRow = {
  id: string;
  user_id: string | null;
  type: string;
  title: string | null;
  body: string | null;
  link_path?: string | null;
};

type DeviceTokenRow = {
  token: string;
  user_id: string | null;
  platform: string | null;
  last_seen_at?: string | null;
};

function normalizePlatform(rawPlatform: string | null | undefined): { basePlatform: string; deviceKey: string } {
  const raw = (rawPlatform || "").toLowerCase();
  const [basePlatform, ...rest] = raw.split(":");
  const deviceKey = rest.join(":");
  return { basePlatform, deviceKey };
}

function dedupeDeviceTokens(rows: DeviceTokenRow[]): DeviceTokenRow[] {
  // Sort newest first so we always keep the most recently seen row
  const sorted = [...rows].sort((a, b) => {
    const at = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
    const bt = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
    return bt - at;
  });
  const seenLogicalDevices = new Set<string>();
  const seenTokens = new Set<string>();
  const out: DeviceTokenRow[] = [];
  for (const r of sorted) {
    const token = String(r.token || "").trim();
    if (!token) continue;
    if (seenTokens.has(token)) continue;

    const { basePlatform, deviceKey } = normalizePlatform(r.platform);
    // A single iPhone can move from guest -> free -> paid/admin. Broadcast pushes
    // must still hit that physical install once, not once per stale account row.
    const logicalKey = deviceKey
      ? `${basePlatform}|${deviceKey}`
      : `${r.user_id || ""}|${basePlatform}|${token}`;
    if (seenLogicalDevices.has(logicalKey)) continue;
    seenLogicalDevices.add(logicalKey);
    seenTokens.add(token);
    out.push(r);
  }
  return out;
}


type DeliveryError = {
  provider: "fcm" | "apns";
  message: string;
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function createApnsJwt() {
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
  const accessToken = await createFirebaseAccessToken(account);
  const url = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;
  let sent = 0;
  const invalidTokens: string[] = [];
  const errors: string[] = [];
  for (const token of tokens) {
    const response = await fetch(url, {
      method: "POST",
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
          android: { priority: "HIGH", notification: { sound: "default" } },
        },
      }),
    });
    if (response.ok) {
      sent += 1;
      continue;
    }
    const raw = await response.text();
    if (response.status === 404 || raw.includes("UNREGISTERED")) invalidTokens.push(token);
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
      badge: 1,
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
  };

  const postTo = (host: string, token: string) =>
    fetch(`${host}/3/device/${token}`, { method: "POST", headers, body });

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
    errors.push(reason || `APNs request failed with status ${res.status}`);
  }
  return { sent, invalidTokens, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
    const provided = req.headers.get("x-push-secret") || "";
    if (!secret || secret.length === 0 || provided !== secret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Idempotency: claim this notification_id before doing anything
    const { error: dispatchInsertError } = await admin
      .from("notification_push_dispatches")
      .insert({ notification_id });
    if (dispatchInsertError) {
      if ((dispatchInsertError as { code?: string }).code === "23505") {
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: "duplicate_dispatch" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: String(dispatchInsertError.message || dispatchInsertError) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const releaseDispatch = async () => {
      await admin.from("notification_push_dispatches").delete().eq("notification_id", notification_id);
    };

    const { data: notif } = await admin
      .from("academy_notifications")
      .select("id, user_id, type, title, body, link_path")
      .eq("id", notification_id)
      .maybeSingle();

    if (!notif || !PUSHABLE_TYPES.has(notif.type)) {
      await releaseDispatch();
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notificationPayload = normalizeNotification(notif as NotificationRow);

    let tokensQuery = admin.from("device_tokens").select("token, user_id, platform, last_seen_at");
    if (notif.user_id) {
      tokensQuery = tokensQuery.eq("user_id", notif.user_id);
    }
    const { data: rows = [] } = await tokensQuery;
    const typedRows = dedupeDeviceTokens(rows as DeviceTokenRow[]);
    const androidTokens = typedRows
      .filter((r) => normalizePlatform(r.platform).basePlatform === "android")
      .map((r) => r.token)
      .filter(Boolean);
    const iosTokens = typedRows
      .filter((r) => normalizePlatform(r.platform).basePlatform === "ios")
      .map((r) => r.token)
      .filter(Boolean);

    if (androidTokens.length === 0 && iosTokens.length === 0) {
      await releaseDispatch();
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    const deliveryErrors: DeliveryError[] = [];

    if (androidTokens.length > 0) {
      try {
        const fcmResult = await sendFcm(androidTokens, notificationPayload);
        sent += fcmResult.sent;
        if (fcmResult.invalidTokens.length > 0) {
          await admin.from("device_tokens").delete().in("token", fcmResult.invalidTokens);
        }
        for (const message of fcmResult.errors) deliveryErrors.push({ provider: "fcm", message });
      } catch (err) {
        deliveryErrors.push({ provider: "fcm", message: String(err) });
      }
    }

    if (iosTokens.length > 0) {
      try {
        const apnsResult = await sendApns(iosTokens, notificationPayload);
        sent += apnsResult.sent || 0;
        if (apnsResult.invalidTokens.length > 0) {
          await admin.from("device_tokens").delete().in("token", apnsResult.invalidTokens);
        }
        for (const message of apnsResult.errors) {
          deliveryErrors.push({ provider: "apns", message });
        }
      } catch (err) {
        deliveryErrors.push({ provider: "apns", message: String(err) });
      }
    }

    if (sent > 0) {
      await admin
        .from("notification_push_dispatches")
        .update({ delivered_at: new Date().toISOString(), sent_count: sent })
        .eq("notification_id", notification_id);
    } else {
      await releaseDispatch();
    }

    return new Response(JSON.stringify({ ok: true, sent, errors: deliveryErrors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
