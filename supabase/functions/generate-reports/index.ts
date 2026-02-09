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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Determine which periods to generate from query params or body
  let periods: string[] = ["weekly", "monthly"];
  try {
    const body = await req.json().catch(() => ({}));
    if (body.period) periods = [body.period];
  } catch {
    // use defaults
  }

  // Get all user_ids that have daily_memory data
  const { data: users, error: usersErr } = await supabase
    .from("daily_memory")
    .select("user_id")
    .order("user_id");

  if (usersErr) {
    return new Response(JSON.stringify({ error: usersErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Deduplicate user_ids
  const uniqueUserIds = [...new Set(users.map((u: { user_id: string }) => u.user_id))];

  const results: { user_id: string; period: string; success: boolean; error?: string }[] = [];

  for (const userId of uniqueUserIds) {
    for (const period of periods) {
      const { error } = await supabase.rpc("generate_reports_for_user", {
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
});
