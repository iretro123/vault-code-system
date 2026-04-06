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

    // ── REFRESH MODE: called by pg_cron ──
    if (mode === "refresh") {
      const fmpKey = Deno.env.get("FMP_API_KEY");
      const finnhubKey = Deno.env.get("FINNHUB_API_KEY");

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);

      const from = getDateStr(0);
      const to = getDateStr(14);

      let eventsCount = 0;
      let earningsCount = 0;

      // ── Economic Calendar: FMP ──
      if (fmpKey) {
        const econRes = await fetch(
          `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${fmpKey}`
        );
        const econData = await econRes.json();
        const rawEvents = Array.isArray(econData) ? econData : [];

        const events = rawEvents
          .filter((e: any) => (e.country || "").toUpperCase() === "US")
          .map((e: any) => ({
            id: `econ-${slugify(e.event)}-${e.date}`,
            date: (e.date || "").split("T")[0],
            time_et: extractTime(e.date) || null,
            country: "US",
            event_name: e.event || "Unknown",
            impact: (e.impact || "Low").toLowerCase(),
            actual: parseNum(e.actual),
            estimate: parseNum(e.estimate ?? e.consensus),
            prev: parseNum(e.previous),
            unit: e.unit || e.currency || "",
            fetched_at: new Date().toISOString(),
          }));

        if (events.length > 0) {
          await sb.from("market_events").delete().lt("date", from);
          for (let i = 0; i < events.length; i += 50) {
            const chunk = events.slice(i, i + 50);
            const { error } = await sb
              .from("market_events")
              .upsert(chunk, { onConflict: "id" });
            if (error) console.error("market_events upsert:", error.message);
          }
        }
        eventsCount = events.length;
      } else {
        console.error("FMP_API_KEY not configured — skipping economic calendar");
      }

      // ── Earnings Calendar: Finnhub ──
      if (finnhubKey) {
        const earningsRes = await fetch(
          `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${finnhubKey}`
        );
        const earningsData = await earningsRes.json();

        const earningsMap = new Map();
        (earningsData?.earningsCalendar || []).forEach((e: any) => {
          const id = `earn-${e.symbol}-${e.date}`;
          if (!earningsMap.has(id)) earningsMap.set(id, e);
        });
        const earnings = Array.from(earningsMap.values()).map((e: any) => ({
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
          for (let i = 0; i < earnings.length; i += 50) {
            const chunk = earnings.slice(i, i + 50);
            const { error } = await sb
              .from("market_earnings")
              .upsert(chunk, { onConflict: "id" });
            if (error) console.error("market_earnings upsert:", error.message);
          }
        }
        earningsCount = earnings.length;
      } else {
        console.error("FINNHUB_API_KEY not configured — skipping earnings");
      }

      return new Response(
        JSON.stringify({ ok: true, events_count: eventsCount, earnings_count: earningsCount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DEFAULT MODE: read cached data ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || `Bearer ${anonKey}`;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const today = getDateStr(0);
    const twoWeeks = getDateStr(14);

    const [eventsResult, earningsResult] = await Promise.all([
      sb.from("market_events").select("*").gte("date", today).lte("date", twoWeeks).order("date", { ascending: true }),
      sb.from("market_earnings").select("*").gte("date", today).lte("date", twoWeeks).order("date", { ascending: true }),
    ]);

    return new Response(
      JSON.stringify({ events: eventsResult.data || [], earnings: earningsResult.data || [] }),
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
  return (s || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
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

function parseNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
