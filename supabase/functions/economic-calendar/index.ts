import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    // ── REFRESH MODE: called by pg_cron, fetches Finnhub → upserts into DB ──
    if (mode === "refresh") {
      const apiKey = Deno.env.get("FINNHUB_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "FINNHUB_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);

      const from = getDateStr(0);
      const to = getDateStr(14);

      const [econRes, earningsRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${apiKey}`),
        fetch(`https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`),
      ]);

      const econData = await econRes.json();
      const earningsData = await earningsRes.json();

      // Normalize + upsert economic events
      const events = (econData?.economicCalendar || []).map((e: any) => ({
        id: `econ-${e.event}-${e.time || e.date}`,
        date: e.date,
        time_et: e.time || null,
        country: e.country || "US",
        event_name: e.event,
        impact: e.impact === 3 ? "high" : e.impact === 2 ? "medium" : "low",
        actual: e.actual ?? null,
        estimate: e.estimate ?? null,
        prev: e.prev ?? null,
        unit: e.unit || "",
        fetched_at: new Date().toISOString(),
      }));

      if (events.length > 0) {
        // Delete old events, then insert fresh
        await sb.from("market_events").delete().lt("date", from);
        const { error: evErr } = await sb
          .from("market_events")
          .upsert(events, { onConflict: "id" });
        if (evErr) console.error("market_events upsert error:", evErr.message);
      }

      // Normalize + upsert earnings
      const earnings = (earningsData?.earningsCalendar || []).map((e: any) => ({
        id: `earn-${e.symbol}-${e.date}`,
        date: e.date,
        symbol: e.symbol,
        hour:
          e.hour === "bmo"
            ? "Before Open"
            : e.hour === "amc"
            ? "After Close"
            : e.hour || "TBD",
        eps_estimate: e.epsEstimate ?? null,
        eps_actual: e.epsActual ?? null,
        revenue_estimate: e.revenueEstimate ?? null,
        revenue_actual: e.revenueActual ?? null,
        quarter: e.quarter ?? null,
        year: e.year ?? null,
        fetched_at: new Date().toISOString(),
      }));

      if (earnings.length > 0) {
        await sb.from("market_earnings").delete().lt("date", from);
        const { error: earnErr } = await sb
          .from("market_earnings")
          .upsert(earnings, { onConflict: "id" });
        if (earnErr) console.error("market_earnings upsert error:", earnErr.message);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          events_count: events.length,
          earnings_count: earnings.length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DEFAULT MODE: read cached data from Supabase tables ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Forward the user's auth header so RLS works
    const authHeader = req.headers.get("Authorization") || `Bearer ${anonKey}`;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const today = getDateStr(0);
    const twoWeeks = getDateStr(14);

    const [eventsResult, earningsResult] = await Promise.all([
      sb
        .from("market_events")
        .select("*")
        .gte("date", today)
        .lte("date", twoWeeks)
        .order("date", { ascending: true }),
      sb
        .from("market_earnings")
        .select("*")
        .gte("date", today)
        .lte("date", twoWeeks)
        .order("date", { ascending: true }),
    ]);

    return new Response(
      JSON.stringify({
        events: eventsResult.data || [],
        earnings: earningsResult.data || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}
