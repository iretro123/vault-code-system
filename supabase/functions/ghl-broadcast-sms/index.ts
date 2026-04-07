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

async function sendSmsToContact(
  apiKey: string,
  locationId: string,
  phone: string,
  name: string,
  email: string | null,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  // Upsert contact
  const upsertBody: Record<string, unknown> = {
    phone,
    locationId,
    name: name || undefined,
  };
  if (email) upsertBody.email = email;

  const { ok: contactOk, data: contactData } = await ghlFetch("/contacts/upsert", apiKey, upsertBody);
  if (!contactOk || !contactData?.contact?.id) {
    return { ok: false, error: `Contact upsert failed for ${phone}` };
  }

  const contactId = contactData.contact.id;

  // Send SMS
  const { ok: smsOk } = await ghlFetch("/conversations/messages", apiKey, {
    type: "SMS",
    contactId,
    message,
  });

  return { ok: smsOk, error: smsOk ? undefined : `SMS send failed for ${phone}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = caller.id;

    // Check operator role using service client
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "operator",
    });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden — operator role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recipientType, userId, message } = await req.json();
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      return new Response(JSON.stringify({ error: "GHL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    if (recipientType === "single" && userId) {
      // Single user
      const { data: profile } = await admin
        .from("profiles")
        .select("phone_number, display_name, email")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile?.phone_number) {
        return new Response(JSON.stringify({ error: "User has no phone number on file" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const personalizedMsg = message.trim().replace(/\{\{name\}\}/gi, profile.display_name || "there");
      const result = await sendSmsToContact(
        GHL_API_KEY,
        GHL_LOCATION_ID,
        profile.phone_number,
        profile.display_name || "",
        profile.email,
        personalizedMsg
      );
      if (result.ok) sent++;
      else { failed++; if (result.error) errors.push(result.error); }

    } else {
      // All members with phone numbers
      const { data: profiles } = await admin
        .from("profiles")
        .select("phone_number, display_name, email")
        .not("phone_number", "is", null)
        .neq("phone_number", "")
        .limit(1000);

      if (!profiles?.length) {
        return new Response(JSON.stringify({ error: "No members with phone numbers found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[GHL Broadcast] Sending SMS to ${profiles.length} members`);

      for (const p of profiles) {
        if (!p.phone_number) continue;
        const personalizedMsg = message.trim().replace(/\{\{name\}\}/gi, p.display_name || "there");
        const result = await sendSmsToContact(
          GHL_API_KEY,
          GHL_LOCATION_ID,
          p.phone_number,
          p.display_name || "",
          p.email,
          personalizedMsg
        );
        if (result.ok) sent++;
        else { failed++; if (result.error) errors.push(result.error); }
      }
    }

    console.log(`[GHL Broadcast] Done — sent: ${sent}, failed: ${failed}`);

    return new Response(JSON.stringify({ sent, failed, errors: errors.slice(0, 10) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[GHL Broadcast] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
