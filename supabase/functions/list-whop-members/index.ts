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
    const whopKey = Deno.env.get("WHOP_API_KEY");
    if (!whopKey) {
      return new Response(JSON.stringify({ error: "WHOP_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 10, 50);
    const status = body.status || "active"; // active | canceled | all

    const params = new URLSearchParams({ per: String(limit) });
    if (status === "active") params.set("valid", "true");
    else if (status === "canceled") params.set("valid", "false");

    const url = `https://api.whop.com/api/v2/memberships?${params.toString()}`;
    console.log("[list-whop-members] Fetching:", url);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${whopKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[list-whop-members] Whop API error:", res.status, text);
      return new Response(JSON.stringify({ error: `Whop API ${res.status}`, details: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const memberships = data.data ?? data.pagination?.data ?? [];

    const members = memberships.map((m: any) => ({
      id: m.id,
      email: m.email ?? m.user?.email ?? null,
      username: m.user?.username ?? null,
      name: m.user?.name ?? null,
      status: m.status,
      valid: m.valid,
      plan: m.plan?.plan_name ?? m.product?.name ?? null,
      created_at: m.created_at,
    }));

    return new Response(JSON.stringify({ count: members.length, members }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[list-whop-members] error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
