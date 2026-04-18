/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is operator
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub as string;

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

    const { recipientType, userId, title, body, templateKey } = await req.json();
    if (!body?.trim()) {
      return new Response(JSON.stringify({ error: "body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which notification category this maps to for preference filtering
    const categoryMap: Record<string, string> = {
      weekly_review: "notify_announcements",
      log_trades: "notify_announcements",
      new_lesson: "notify_new_modules",
      live_session: "notify_live_events",
    };
    const prefColumn = categoryMap[templateKey || ""] || "notify_announcements";

    let sent = 0;
    let failed = 0;

    if (recipientType === "single" && userId) {
      // Single user — check their preferences
      const { data: profile } = await admin
        .from("profiles")
        .select("email, display_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile?.email) {
        return new Response(JSON.stringify({ error: "User has no email on file" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: prefs } = await admin
        .from("user_preferences")
        .select("notifications_enabled, preferred_alert_channel, " + prefColumn)
        .eq("user_id", userId)
        .maybeSingle();

      // Check preferences (default to allowing if no prefs row)
      const notifEnabled = prefs?.notifications_enabled ?? true;
      const alertChannel = prefs?.preferred_alert_channel ?? "in_app";
      const categoryEnabled = (prefs as any)?.[prefColumn] ?? true;

      if (!notifEnabled || !categoryEnabled || (alertChannel !== "email" && alertChannel !== "both")) {
        return new Response(JSON.stringify({ sent: 0, failed: 0, skipped: 1, reason: "User preferences block email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Enqueue email (placeholder — will be wired to transactional email infra when domain is set up)
      // For now, log the intent
      console.log(`[Broadcast Email] Would send to ${profile.email}: ${title}`);
      sent = 1;

    } else {
      // All members — query profiles + preferences, filter by opt-in
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, email, display_name")
        .not("email", "is", null)
        .neq("email", "")
        .limit(1000);

      if (!profiles?.length) {
        return new Response(JSON.stringify({ error: "No members with email found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Batch-fetch preferences
      const userIds = profiles.map((p) => p.user_id);
      const { data: allPrefs } = await admin
        .from("user_preferences")
        .select("user_id, notifications_enabled, preferred_alert_channel, " + prefColumn)
        .in("user_id", userIds);

      const prefsMap = new Map((allPrefs || []).map((p: any) => [p.user_id, p]));

      for (const profile of profiles) {
        const prefs = prefsMap.get(profile.user_id) as any;
        const notifEnabled = prefs?.notifications_enabled ?? true;
        const alertChannel = prefs?.preferred_alert_channel ?? "in_app";
        const categoryEnabled = prefs?.[prefColumn] ?? true;

        if (!notifEnabled || !categoryEnabled || (alertChannel !== "email" && alertChannel !== "both")) {
          failed++; // skipped due to preferences
          continue;
        }

        const personalizedBody = body.trim().replace(/\{\{name\}\}/gi, profile.display_name || "there");
        console.log(`[Broadcast Email] Would send to ${profile.email}: ${title} — ${personalizedBody.slice(0, 50)}`);
        sent++;
      }
    }

    console.log(`[Broadcast Email] Done — sent: ${sent}, skipped: ${failed}`);

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Broadcast Email] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
