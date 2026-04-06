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

      // ── Economic Calendar: Scrape MarketWatch ──
      try {
        const mwRes = await fetch("https://www.marketwatch.com/economy-politics/calendar", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        const html = await mwRes.text();
        console.log(`MarketWatch HTML length: ${html.length}`);

        const events = parseMarketWatchEvents(html);
        console.log(`Parsed ${events.length} economic events from MarketWatch`);

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
        console.error("Failed to scrape MarketWatch:", (err as Error).message);
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

// ── Parse MarketWatch economic calendar HTML table ──
function parseMarketWatchEvents(html: string): any[] {
  const events: any[] = [];

  // Extract the table body content
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) {
    console.error("No <tbody> found in MarketWatch HTML");
    return events;
  }

  const tbody = tbodyMatch[1];
  // Split into rows
  const rows = tbody.split(/<tr[^>]*>/i).filter((r) => r.includes("<td"));

  let currentDate: string | null = null;
  const currentYear = new Date().getFullYear();

  const monthMap: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
  };

  for (const row of rows) {
    // Extract all <td> cell contents
    const cells: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let m;
    while ((m = tdRegex.exec(row)) !== null) {
      // Strip HTML tags from cell content
      cells.push(m[1].replace(/<[^>]+>/g, "").trim());
    }

    if (cells.length < 2) continue;

    const firstCell = cells[0];

    // Check if this is a date header row (bold day name like "MONDAY, APRIL 6")
    const dateMatch = firstCell.match(
      /(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),?\s+([A-Z]+)\s+(\d{1,2})/i
    );

    if (dateMatch) {
      const monthStr = dateMatch[1].toLowerCase();
      const day = dateMatch[2].padStart(2, "0");
      const month = monthMap[monthStr];
      if (month) {
        // Handle year boundary (if month is Jan/Feb and current month is Nov/Dec)
        let year = currentYear;
        const currentMonth = new Date().getMonth() + 1;
        const parsedMonth = parseInt(month);
        if (currentMonth >= 11 && parsedMonth <= 2) year++;

        currentDate = `${year}-${month}-${day}`;
      }
      continue;
    }

    // Regular event row: Time | Report | Period | Actual | Forecast | Previous
    if (!currentDate) continue;

    const timeRaw = cells[0] || "";
    const reportName = cells[1] || "";
    if (!reportName) continue;

    // Parse time to 24h format
    const timeEt = parseTimeET(timeRaw);

    // Parse numeric values
    const actual = cells.length > 3 ? parseNumericValue(cells[3]) : null;
    const forecast = cells.length > 4 ? parseNumericValue(cells[4]) : null;
    const previous = cells.length > 5 ? parseNumericValue(cells[5]) : null;

    // Determine unit from the raw strings
    const unit = detectUnit(cells[4] || cells[5] || cells[3] || "");

    const impact = classifyImpact(reportName);
    const id = `mw-${slugify(reportName)}-${currentDate}`;

    events.push({
      id,
      date: currentDate,
      time_et: timeEt,
      country: "US",
      event_name: reportName,
      impact,
      actual,
      estimate: forecast,
      prev: previous,
      unit,
      fetched_at: new Date().toISOString(),
    });
  }

  // Deduplicate
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function parseTimeET(raw: string): string | null {
  const m = raw.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?|am|pm)/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = m[2];
  const ampm = m[3].replace(/\./g, "").toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${min}`;
}

function parseNumericValue(raw: string): number | null {
  if (!raw || raw === "--" || raw === "N/A" || raw === "n/a") return null;
  // Remove $, commas, "billion", "million", "%" etc — keep the number
  const cleaned = raw.replace(/[$,]/g, "").replace(/\s*(billion|million|thousand|%)/gi, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function detectUnit(raw: string): string {
  if (!raw) return "";
  if (raw.includes("%")) return "%";
  if (/billion/i.test(raw)) return "billion";
  if (/million/i.test(raw)) return "million";
  if (/thousand/i.test(raw)) return "thousand";
  return "";
}

function classifyImpact(name: string): string {
  const upper = name.toUpperCase();
  const high = [
    "FOMC", "FEDERAL FUNDS", "FED INTEREST", "CPI", "CONSUMER PRICE",
    "NFP", "NONFARM", "NON-FARM", "GDP", "GROSS DOMESTIC", "FED CHAIR",
    "INFLATION", "JOBS REPORT", "PCE", "CORE PCE", "FED MEETING",
    "PAYROLLS", "EMPLOYMENT SITUATION",
  ];
  const medium = [
    "PPI", "PRODUCER PRICE", "UNEMPLOYMENT", "JOBLESS", "RETAIL SALES",
    "PMI", "ISM", "DURABLE", "EMPLOYMENT", "PAYROLL", "HOUSING",
    "CONSUMER CONFIDENCE", "MICHIGAN", "TRADE BALANCE", "CONSUMER CREDIT",
    "PERSONAL INCOME", "PERSONAL SPENDING", "EXISTING HOME", "NEW HOME",
    "BUILDING PERMITS", "INDUSTRIAL PRODUCTION",
  ];

  if (high.some((kw) => upper.includes(kw))) return "high";
  if (medium.some((kw) => upper.includes(kw))) return "medium";
  // Fed speakers → medium
  if (/\b(FED|FEDERAL RESERVE|SPEAKS|SPEECH)\b/i.test(upper)) return "medium";
  return "low";
}

function getDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split("T")[0];
}

function slugify(s: string): string {
  return (s || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
