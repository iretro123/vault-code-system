import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "https://esm.sh/jose@5.9.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-push-secret",
};

const FCM_URL = "https://fcm.googleapis.com/fcm/send";
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
};

type FcmResult = {
  error?: string;
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

async function sendApns(tokens: string[], notif: ReturnType<typeof normalizeNotification>) {
  if (tokens.length === 0) return { sent: 0 };
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  if (!bundleId) return { sent: 0, error: "APNS_BUNDLE_ID not set" };
  const jwt = await createApnsJwt();
  if (!jwt) return { sent: 0, error: "APNS credentials missing" };
  const useSandbox = (Deno.env.get("APNS_USE_SANDBOX") || "").toLowerCase() === "true";
  const host = useSandbox ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";

  let sent = 0;
  for (const token of tokens) {
    const res = await fetch(`${host}/3/device/${token}`, {
      method: "POST",
      headers: {
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        authorization: `bearer ${jwt}`,
      },
      body: JSON.stringify({
        aps: {
          alert: { title: notif.title, body: notif.body },
          sound: "default",
          category: notif.category,
          "thread-id": notif.threadId,
        },
        notification_id: notif.id,
        type: notif.type,
        link_path: notif.linkPath,
      }),
    });
    if (res.ok) sent += 1;
  }
  return { sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
    const provided = req.headers.get("x-push-secret") || "";
    if (secret && secret.length > 0 && provided !== secret) {
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
    const fcmKey = Deno.env.get("FCM_SERVER_KEY");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: notif } = await admin
      .from("academy_notifications")
      .select("id, user_id, type, title, body, link_path")
      .eq("id", notification_id)
      .maybeSingle();

    if (!notif || !PUSHABLE_TYPES.has(notif.type)) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notificationPayload = normalizeNotification(notif as NotificationRow);

    let tokensQuery = admin.from("device_tokens").select("token, user_id, platform");
    if (notif.user_id) {
      tokensQuery = tokensQuery.eq("user_id", notif.user_id);
    }
    const { data: rows = [] } = await tokensQuery;
    const typedRows = rows as DeviceTokenRow[];
    const androidTokens = typedRows
      .filter((r) => (r.platform || "").toLowerCase() === "android")
      .map((r) => r.token)
      .filter(Boolean);
    const iosTokens = typedRows
      .filter((r) => (r.platform || "").toLowerCase() === "ios")
      .map((r) => r.token)
      .filter(Boolean);

    if (androidTokens.length === 0 && iosTokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    if (androidTokens.length > 0) {
      if (!fcmKey) {
        return new Response(JSON.stringify({ error: "FCM_SERVER_KEY not set" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const group of chunk(androidTokens, 900)) {
        const payload = {
          registration_ids: group,
          notification: {
            title: notificationPayload.title,
            body: notificationPayload.body,
            sound: "default",
          },
          data: {
            notification_id: notificationPayload.id,
            type: notificationPayload.type,
            category: notificationPayload.category,
            thread_id: notificationPayload.threadId,
            link_path: notificationPayload.linkPath,
          },
          android: { priority: "high" },
        };

        const res = await fetch(FCM_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${fcmKey}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        sent += result?.success ?? 0;

        // Cleanup invalid tokens
        if (result?.results && Array.isArray(result.results)) {
          const badTokens: string[] = [];
          (result.results as FcmResult[]).forEach((r, idx: number) => {
            if (r?.error === "NotRegistered" || r?.error === "InvalidRegistration") {
              badTokens.push(group[idx]);
            }
          });
          if (badTokens.length > 0) {
            await admin.from("device_tokens").delete().in("token", badTokens);
          }
        }
      }
    }

    if (iosTokens.length > 0) {
      const apnsResult = await sendApns(iosTokens, notificationPayload);
      sent += apnsResult.sent || 0;
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
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
