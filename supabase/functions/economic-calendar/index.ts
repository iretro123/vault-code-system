const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "FINNHUB_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from") || getDateStr(0);
    const to = url.searchParams.get("to") || getDateStr(14);

    // Fetch economic calendar + earnings in parallel
    const [econRes, earningsRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`),
    ]);

    const econData = await econRes.json();
    const earningsData = await earningsRes.json();

    // Normalize economic events
    const events = (econData?.economicCalendar || []).map((e: any) => ({
      id: `econ-${e.event}-${e.time || e.date}`,
      type: "economic" as const,
      date: e.date,
      time: e.time || null,
      country: e.country,
      event: e.event,
      impact: e.impact === 3 ? "high" : e.impact === 2 ? "medium" : "low",
      actual: e.actual ?? null,
      estimate: e.estimate ?? null,
      prev: e.prev ?? null,
      unit: e.unit || "",
    }));

    // Normalize earnings
    const earnings = (earningsData?.earningsCalendar || []).map((e: any) => ({
      id: `earn-${e.symbol}-${e.date}`,
      type: "earnings" as const,
      date: e.date,
      symbol: e.symbol,
      hour: e.hour === "bmo" ? "Before Open" : e.hour === "amc" ? "After Close" : e.hour || "TBD",
      epsEstimate: e.epsEstimate ?? null,
      epsActual: e.epsActual ?? null,
      revenueEstimate: e.revenueEstimate ?? null,
      revenueActual: e.revenueActual ?? null,
      quarter: e.quarter ?? null,
      year: e.year ?? null,
    }));

    return new Response(JSON.stringify({ events, earnings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
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
