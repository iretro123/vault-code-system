import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "https://esm.sh/jose@5.9.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-push-secret",
};

const FCM_URL = "https://fcm.googleapis.com/fcm/send";

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

async function sendApns(tokens: string[], notif: { title: string; body: string; link_path?: string | null }) {
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
          alert: { title: notif.title, body: notif.body || "" },
          sound: "default",
        },
        link_path: notif.link_path || "/academy/community",
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

    if (!fcmKey) {
      return new Response(JSON.stringify({ error: "FCM_SERVER_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: notif } = await admin
      .from("academy_notifications")
      .select("id, user_id, type, title, body, link_path")
      .eq("id", notification_id)
      .maybeSingle();

    if (!notif || (notif.type !== "mention" && notif.type !== "rz_message" && notif.type !== "live_now")) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let tokensQuery = admin.from("device_tokens").select("token, user_id, platform");
    if (notif.user_id) {
      tokensQuery = tokensQuery.eq("user_id", notif.user_id);
    }
    const { data: rows } = await tokensQuery;
    const androidTokens = (rows || []).filter((r: any) => (r.platform || "").toLowerCase() === "android").map((r: any) => r.token).filter(Boolean);
    const iosTokens = (rows || []).filter((r: any) => (r.platform || "").toLowerCase() === "ios").map((r: any) => r.token).filter(Boolean);

    if (androidTokens.length === 0 && iosTokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    if (androidTokens.length > 0) {
      for (const group of chunk(androidTokens, 900)) {
        const payload = {
          registration_ids: group,
          notification: {
            title: notif.title,
            body: notif.body || "",
            sound: "default",
          },
          data: {
            notification_id: notif.id,
            type: notif.type,
            link_path: notif.link_path || "/academy/community",
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
          result.results.forEach((r: any, idx: number) => {
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
      const apnsResult = await sendApns(iosTokens, {
        title: notif.title,
        body: notif.body || "",
        link_path: notif.link_path,
      });
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
