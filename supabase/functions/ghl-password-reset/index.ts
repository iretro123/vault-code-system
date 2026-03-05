import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-04-15";

async function ghlFetch(path: string, apiKey: string, body: Record<string, unknown>) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`[GHL] ${path} failed:`, res.status, data);
  }
  return { ok: res.ok, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, origin } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      console.error("[GHL] Missing GHL_API_KEY or GHL_LOCATION_ID");
      return new Response(JSON.stringify({ error: "GHL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Look up phone number from profiles
    const { data: profile } = await sb
      .from("profiles")
      .select("phone_number, display_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const phone = profile?.phone_number || null;
    const displayName = profile?.display_name || "";

    // 2. Generate password reset link via admin API
    const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "")}/reset-password`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[GHL] Failed to generate reset link:", linkError?.message);
      return new Response(JSON.stringify({ error: "Failed to generate reset link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resetLink = linkData.properties.action_link;

    // 3. Upsert contact in GHL
    const upsertBody: Record<string, unknown> = {
      email: normalizedEmail,
      locationId: GHL_LOCATION_ID,
      name: displayName || undefined,
    };
    if (phone) {
      upsertBody.phone = phone;
    }

    const { ok: contactOk, data: contactData } = await ghlFetch(
      "/contacts/upsert",
      GHL_API_KEY,
      upsertBody
    );

    if (!contactOk || !contactData?.contact?.id) {
      console.error("[GHL] Contact upsert failed:", contactData);
      return new Response(JSON.stringify({ error: "GHL contact upsert failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contactId = contactData.contact.id;
    console.log("[GHL] Contact upserted:", contactId);

    const results = { sms: false, email: false };

    // 4. Send SMS if phone number exists
    if (phone) {
      const smsBody = `Vault Academy — Reset your password: ${resetLink}`;
      const { ok: smsOk } = await ghlFetch("/conversations/messages", GHL_API_KEY, {
        type: "SMS",
        contactId,
        message: smsBody,
      });
      results.sms = smsOk;
      console.log("[GHL] SMS sent:", smsOk);
    }

    // 5. Send Email (GHL requires "html" field for Email type, not "message")
    const emailHtml = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="margin:0 0 16px;">Vault Academy — Password Reset</h2>
      <p>Hi${displayName ? ` ${displayName}` : ""},</p>
      <p>You requested a password reset for your Vault Academy account.</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a></p>
      <p style="font-size:12px;color:#888;">If you didn't request this, you can safely ignore this email.</p>
    </div>`;
    const emailPayload: Record<string, unknown> = {
      type: "Email",
      contactId,
      html: emailHtml,
      message: emailHtml,
      subject: "Reset Your Vault Academy Password",
    };
    // Add emailFrom if configured
    const GHL_EMAIL_FROM = Deno.env.get("GHL_EMAIL_FROM");
    if (GHL_EMAIL_FROM) {
      emailPayload.emailFrom = GHL_EMAIL_FROM;
    }
    const { ok: emailOk } = await ghlFetch("/conversations/messages", GHL_API_KEY, emailPayload);
    results.email = emailOk;
    console.log("[GHL] Email sent:", emailOk);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[GHL] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
