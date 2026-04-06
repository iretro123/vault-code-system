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

    // ── REFRESH MODE: called by pg_cron, fetches FMP → upserts into DB ──
    if (mode === "refresh") {
      const apiKey = Deno.env.get("FMP_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "FMP_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);

      const from = getDateStr(0);
      const to = getDateStr(14);

      const [econRes, earningsRes] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${apiKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${apiKey}`),
      ]);

      const econData = await econRes.json();
      const earningsData = await earningsRes.json();

      // Normalize FMP economic events → market_events
      const rawEvents = Array.isArray(econData) ? econData : [];
      const events = rawEvents
        .filter((e: any) => e.country === "US")
        .map((e: any) => ({
          id: `econ-${slugify(e.event)}-${e.date}`,
          date: e.date,
          time_et: extractTime(e.date) || null,
          country: e.country || "US",
          event_name: e.event,
          impact: (e.impact || "Low").toLowerCase(),
          actual: e.actual ?? null,
          estimate: e.estimate ?? e.consensus ?? null,
          prev: e.previous ?? null,
          unit: e.unit || e.currency || "",
          fetched_at: new Date().toISOString(),
        }));

      if (events.length > 0) {
        await sb.from("market_events").delete().lt("date", from);
        for (let i = 0; i < events.length; i += 50) {
          const chunk = events.slice(i, i + 50);
          const { error: evErr } = await sb
            .from("market_events")
            .upsert(chunk, { onConflict: "id" });
          if (evErr) console.error("market_events upsert error:", evErr.message);
        }
      }

      // Normalize FMP earnings → market_earnings
      const rawEarnings = Array.isArray(earningsData) ? earningsData : [];
      const earningsMap = new Map();
      rawEarnings.forEach((e: any) => {
        const id = `earn-${e.symbol}-${e.date}`;
        if (!earningsMap.has(id)) earningsMap.set(id, e);
      });
      const earnings = Array.from(earningsMap.values()).map((e: any) => ({
        id: `earn-${e.symbol}-${e.date}`,
        date: e.date,
        symbol: e.symbol,
        hour:
          e.time === "bmo"
            ? "Before Open"
            : e.time === "amc"
            ? "After Close"
            : e.time || "TBD",
        eps_estimate: e.epsEstimated ?? null,
        eps_actual: e.eps ?? null,
        revenue_estimate: e.revenueEstimated ?? null,
        revenue_actual: e.revenue ?? null,
        quarter: e.fiscalDateEnding ? getQuarterFromDate(e.fiscalDateEnding) : null,
        year: e.fiscalDateEnding ? new Date(e.fiscalDateEnding).getFullYear() : null,
        fetched_at: new Date().toISOString(),
      }));

      if (earnings.length > 0) {
        await sb.from("market_earnings").delete().lt("date", from);
        for (let i = 0; i < earnings.length; i += 50) {
          const chunk = earnings.slice(i, i + 50);
          const { error: earnErr } = await sb
            .from("market_earnings")
            .upsert(chunk, { onConflict: "id" });
          if (earnErr) console.error("market_earnings upsert error:", earnErr.message);
        }
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

function slugify(s: string): string {
  return (s || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function extractTime(dateStr: string): string | null {
  if (!dateStr || !dateStr.includes("T")) return null;
  try {
    const d = new Date(dateStr);
    const h = d.getUTCHours().toString().padStart(2, "0");
    const m = d.getUTCMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return null;
  }
}

function getQuarterFromDate(dateStr: string): number | null {
  try {
    const m = new Date(dateStr).getMonth();
    return Math.floor(m / 3) + 1;
  } catch {
    return null;
  }
}
