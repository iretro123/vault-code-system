import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-04-15";

const TAGS = ["vault-os-account-created", "full-access-started"];

async function ghlPost(path: string, apiKey: string, body: Record<string, unknown>) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) console.error(`[ghl-full-access-started] ${path} failed:`, res.status, JSON.stringify(data));
  return { ok: res.ok, data };
}

function buildEmail(email: string, displayName: string, activationLink: string) {
  const greeting = displayName ? ` ${displayName}` : "";
  return `<div style="background:#0b0d12;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#11141b;border:1px solid #1f2430;border-radius:16px;padding:32px;color:#e6e9f0;">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#6b8afd;font-weight:700;">Vault Trading Academy</div>
    <h1 style="margin:12px 0 8px;font-size:24px;font-weight:700;color:#ffffff;">Your Vault OS account is ready</h1>
    <p style="margin:0 0 20px;color:#a9b1c2;font-size:15px;line-height:1.6;">Hi${greeting}, your account was created successfully and full access has started.</p>
    <div style="background:#0e1118;border:1px solid #1f2430;border-radius:12px;padding:16px;margin:0 0 20px;">
      <div style="font-size:12px;color:#7c869c;text-transform:uppercase;letter-spacing:.1em;">Login email</div>
      <div style="font-size:16px;font-weight:600;color:#ffffff;margin-top:4px;">${email}</div>
      <div style="font-size:14px;color:#a9b1c2;margin-top:12px;">Use the password you created in the app.</div>
    </div>
    <a href="${activationLink}" style="display:inline-block;padding:14px 26px;background:#2563eb;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Open Vault OS</a>
    <p style="margin:20px 0 0;font-size:13px;color:#7c869c;line-height:1.6;">Backup activation link:<br /><a href="${activationLink}" style="color:#6b8afd;word-break:break-all;">${activationLink}</a></p>
    <p style="margin:16px 0 0;font-size:13px;color:#7c869c;line-height:1.6;">Forgot your password? Tap “Forgot password” on the login screen to reset it. We never store or send your password.</p>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      console.error("[ghl-full-access-started] Missing GHL_API_KEY or GHL_LOCATION_ID");
      return new Response(JSON.stringify({ error: "GHL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email.trim().toLowerCase();

    // Best-effort profile lookup for name/phone personalization
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, phone_number")
      .eq("user_id", user.id)
      .maybeSingle();

    const displayName =
      profile?.display_name || (user.user_metadata?.display_name as string | undefined) || "";
    const phone = profile?.phone_number || null;

    const upsertBody: Record<string, unknown> = {
      email,
      locationId: GHL_LOCATION_ID,
      tags: TAGS,
    };
    if (displayName) upsertBody.name = displayName;
    if (phone) upsertBody.phone = phone;

    const { ok: contactOk, data: contactData } = await ghlPost("/contacts/upsert", GHL_API_KEY, upsertBody);
    const contactId = (contactData as any)?.contact?.id;

    if (!contactOk || !contactId) {
      return new Response(JSON.stringify({ error: "GHL contact upsert failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activationLink = `https://member.vaulttradingacademy.com/auth?next=membership&email=${encodeURIComponent(email)}`;
    const html = buildEmail(email, displayName, activationLink);

    const emailPayload: Record<string, unknown> = {
      type: "Email",
      contactId,
      subject: "Your Vault OS account is ready",
      html,
      message: html,
    };
    const GHL_EMAIL_FROM = Deno.env.get("GHL_EMAIL_FROM");
    if (GHL_EMAIL_FROM) emailPayload.emailFrom = GHL_EMAIL_FROM;

    const { ok: emailOk } = await ghlPost("/conversations/messages", GHL_API_KEY, emailPayload);

    console.log("[ghl-full-access-started] done", JSON.stringify({ contactId, emailOk, tagged: true }));

    return new Response(
      JSON.stringify({ success: true, contact_id: contactId, email_sent: emailOk, tags: TAGS }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[ghl-full-access-started] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
