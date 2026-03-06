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
    // --- AUTH: Require JWT + operator role ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user with anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check operator role
    const sb = createClient(supabaseUrl, serviceKey);
    const { data: isOperator } = await sb.rpc("has_role", {
      _user_id: user.id,
      _role: "operator",
    });
    if (!isOperator) {
      return new Response(JSON.stringify({ error: "Forbidden: operator role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Original logic ---
    let periods: string[] = ["weekly", "monthly"];
    try {
      const body = await req.json().catch(() => ({}));
      if (body.period) periods = [body.period];
    } catch {
      // use defaults
    }

    const { data: users, error: usersErr } = await sb
      .from("daily_memory")
      .select("user_id")
      .order("user_id");

    if (usersErr) {
      return new Response(JSON.stringify({ error: usersErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniqueUserIds = [...new Set(users.map((u: { user_id: string }) => u.user_id))];
    const results: { user_id: string; period: string; success: boolean; error?: string }[] = [];

    for (const userId of uniqueUserIds) {
      for (const period of periods) {
        const { error } = await sb.rpc("generate_reports_for_user", {
          _user_id: userId,
          _period: period,
        });
        results.push({
          user_id: userId,
          period,
          success: !error,
          error: error?.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ processed: uniqueUserIds.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[generate-reports] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
