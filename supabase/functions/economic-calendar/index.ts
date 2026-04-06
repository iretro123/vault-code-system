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
      const finnhubKey = Deno.env.get("FINNHUB_API_KEY");

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);

      const from = getDateStr(0);
      const to = getDateStr(14);

      let eventsCount = 0;
      let earningsCount = 0;

      // ── Economic Calendar: Scrape feargreedmeter.com ──
      try {
        const fgmRes = await fetch("https://feargreedmeter.com/events", {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; VaultBot/1.0)",
            Accept: "text/html",
          },
        });
        const html = await fgmRes.text();
        console.log(`FearGreedMeter HTML length: ${html.length}`);

        const events = parseFearGreedMeterEvents(html);
        console.log(`Parsed ${events.length} economic events from feargreedmeter.com`);

        if (events.length > 0) {
          await sb.from("market_events").delete().lt("date", from);
          for (let i = 0; i < events.length; i += 50) {
            const chunk = events.slice(i, i + 50);
            const { error } = await sb
              .from("market_events")
              .upsert(chunk, { onConflict: "id" });
            if (error) console.error("market_events upsert:", error.message);
          }
          eventsCount = events.length;
        }
      } catch (err) {
        console.error("Failed to scrape feargreedmeter.com:", (err as Error).message);
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

// ── Parse feargreedmeter.com/events HTML ──
function parseFearGreedMeterEvents(html: string): any[] {
  const events: any[] = [];

  // The page has event blocks with dates and event names
  // Pattern: date headers followed by event entries
  // Look for structured event data in the HTML

  // Extract event blocks - they typically have a date, title, and sometimes time/details
  // Try multiple parsing strategies

  // Strategy 1: Look for event cards/blocks with dates
  const datePattern = /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[\s·,]+([A-Z][a-z]+)\s+(\d{1,2}),?\s*(\d{4})?/gi;
  const eventTitlePattern = /<h[2-4][^>]*>([^<]+)<\/h[2-4]>/gi;

  // Strategy 2: Look for structured data - many calendar sites use JSON-LD or structured divs
  const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      console.log("Found JSON-LD data:", JSON.stringify(ld).slice(0, 200));
    } catch {}
  }

  // Strategy 3: Parse the visible text content for event patterns
  // Remove HTML tags to get clean text
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n");

  // Look for date + event name patterns in the text
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let currentDate: string | null = null;
  const currentYear = new Date().getFullYear();

  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    january: "01", february: "02", march: "03", april: "04",
    june: "06", july: "07", august: "08", september: "09",
    october: "10", november: "11", december: "12",
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match date patterns like "Apr 09, 2026" or "April 9, 2026" or "Thu · Apr 09"
    const dateMatch = line.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[\s·,]*([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})?/i)
      || line.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);

    if (dateMatch) {
      const monthStr = dateMatch[1].toLowerCase();
      const day = dateMatch[2].padStart(2, "0");
      const year = dateMatch[3] || currentYear.toString();
      const month = monthMap[monthStr];
      if (month) {
        currentDate = `${year}-${month}-${day}`;
        continue;
      }
    }

    // If we have a current date, check if this line looks like an event name
    if (currentDate && isLikelyEventName(line)) {
      // Look ahead for time info
      const timeStr = extractTimeFromNearbyLines(lines, i);
      const impact = classifyImpact(line);

      events.push({
        id: `econ-${slugify(line)}-${currentDate}`,
        date: currentDate,
        time_et: timeStr,
        country: "US",
        event_name: line,
        impact,
        actual: null,
        estimate: null,
        prev: null,
        unit: "",
        fetched_at: new Date().toISOString(),
      });
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function isLikelyEventName(line: string): boolean {
  const keywords = [
    "CPI", "PPI", "FOMC", "Fed", "Federal", "NFP", "Nonfarm", "Non-Farm",
    "GDP", "Unemployment", "Jobless", "Employment", "Payroll", "Retail Sales",
    "Consumer", "Producer", "Interest Rate", "Housing", "PMI", "ISM",
    "Trade Balance", "Durable Goods", "Industrial Production", "Existing Home",
    "New Home", "Building Permits", "Consumer Confidence", "Michigan",
    "PCE", "Core PCE", "Treasury", "Beige Book", "Minutes",
    "Inflation", "Jobs Report", "Labor", "Wage",
  ];
  const upper = line.toUpperCase();
  return keywords.some((kw) => upper.includes(kw.toUpperCase())) && line.length < 120;
}

function classifyImpact(name: string): string {
  const upper = name.toUpperCase();
  const high = ["FOMC", "FEDERAL FUNDS", "FED INTEREST", "CPI", "CONSUMER PRICE",
    "NFP", "NONFARM", "NON-FARM", "GDP", "GROSS DOMESTIC", "FED CHAIR",
    "INFLATION REPORT", "JOBS REPORT", "PCE", "CORE PCE"];
  const medium = ["PPI", "PRODUCER PRICE", "UNEMPLOYMENT", "JOBLESS", "RETAIL SALES",
    "PMI", "ISM", "DURABLE GOODS", "EMPLOYMENT", "PAYROLL", "HOUSING",
    "CONSUMER CONFIDENCE", "MICHIGAN", "TRADE BALANCE"];

  if (high.some((kw) => upper.includes(kw))) return "high";
  if (medium.some((kw) => upper.includes(kw))) return "medium";
  return "low";
}

function extractTimeFromNearbyLines(lines: string[], idx: number): string | null {
  // Check current line and next 2 lines for time patterns
  for (let j = idx; j < Math.min(idx + 3, lines.length); j++) {
    const timeMatch = lines[j].match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\s*(E[SDT]T|Eastern)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1]);
      const m = timeMatch[2];
      const ampm = timeMatch[3]?.toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return `${h.toString().padStart(2, "0")}:${m}`;
    }
  }
  return null;
}

function getDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

function slugify(s: string): string {
  return (s || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
