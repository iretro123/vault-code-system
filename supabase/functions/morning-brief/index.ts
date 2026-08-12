/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "openai/gpt-5.6-sol";

interface BriefItem {
  kind: "focus" | "caution" | "ahead";
  title: string;
  body: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function etDateStr(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000 - 4 * 3600000);
  return d.toISOString().slice(0, 10);
}

function fmtTime(timeEt: string | null): string {
  if (!timeEt) return "";
  const [hStr, m] = timeEt.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm} ET`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authed.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const today = etDateStr(0);

    // ── Cached brief for today ──
    const { data: cached } = await admin
      .from("daily_briefs")
      .select("items")
      .eq("user_id", user.id)
      .eq("brief_date", today)
      .maybeSingle();

    if (cached?.items) {
      return json({ date: today, items: cached.items, cached: true });
    }

    const weekAhead = etDateStr(7);
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
    const mondayStr = monday.toISOString().slice(0, 10);

    const [eventsRes, profileRes, tradesRes, journalRes, liveRes, moduleRes] = await Promise.all([
      admin
        .from("market_events")
        .select("date, time_et, event_name, impact, estimate, prev, unit")
        .gte("date", today)
        .lte("date", weekAhead)
        .eq("country", "US")
        .order("date", { ascending: true }),
      admin.from("profiles").select("display_name, timezone").eq("id", user.id).maybeSingle(),
      admin
        .from("trade_entries")
        .select("id, outcome, risk_reward, risk_used, created_at")
        .eq("user_id", user.id)
        .gte("created_at", `${mondayStr}T00:00:00Z`),
      admin
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("entry_date", mondayStr),
      admin
        .from("live_sessions")
        .select("title, session_date")
        .gte("session_date", new Date().toISOString())
        .order("session_date", { ascending: true })
        .limit(1),
      admin
        .from("academy_modules")
        .select("title, created_at")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    const allEvents = eventsRes.data || [];
    const bigEvents = allEvents.filter((e: any) => e.impact === "high").slice(0, 8);
    const todayEvents = allEvents.filter((e: any) => e.date === today);
    const trades = tradesRes.data || [];
    const journalCount = journalRes.count ?? 0;
    const nextLive = liveRes.data?.[0] || null;
    const newestModule = moduleRes.data?.[0] || null;
    const firstName = (profileRes.data?.display_name || "Trader").split(" ")[0];

    const eventLines = (bigEvents.length ? bigEvents : allEvents.slice(0, 8)).map(
      (e: any) =>
        `${e.date}${e.time_et ? ` ${fmtTime(e.time_et)}` : ""} — ${e.event_name} (${e.impact} impact)`
    );

    // ── Deterministic fallback brief ──
    const fallback: BriefItem[] = [
      {
        kind: "focus",
        title: "Today's focus",
        body:
          trades.length === 0
            ? "No trades logged this week yet. One clean, planned trade beats five reactive ones. Start with your plan."
            : `${trades.length} trade${trades.length === 1 ? "" : "s"} logged this week. Protect the process — same rules, same size, no improvising.`,
      },
      {
        kind: "caution",
        title: "Be careful this week",
        body: bigEvents.length
          ? `High-impact data ahead: ${bigEvents
              .slice(0, 3)
              .map((e: any) => e.event_name)
              .join(", ")}. Expect fast, whippy moves around the release — size down or stand aside.`
          : "No major data on the calendar. Low-catalyst days invite overtrading — stick to your max trade count.",
      },
      {
        kind: "ahead",
        title: "What's coming",
        body: [
          nextLive ? `Live call: ${nextLive.title}` : null,
          newestModule ? `Newest lesson: ${newestModule.title}` : null,
          journalCount === 0 ? "Weekly review is still open — log one journal entry." : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Nothing scheduled. Use the quiet stretch to review last week's trades.",
      },
    ];

    let items: BriefItem[] = fallback;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      const prompt = `Write today's trading brief for ${firstName}.

DATE (ET): ${today}
UPCOMING US ECONOMIC DATA (next 7 days):
${eventLines.length ? eventLines.join("\n") : "None on the calendar."}
RELEASES TODAY: ${todayEvents.map((e: any) => e.event_name).join(", ") || "none"}
THEIR WEEK SO FAR: ${trades.length} trades logged, ${journalCount} journal entries.
NEXT LIVE CALL: ${nextLive ? `${nextLive.title} on ${nextLive.session_date}` : "none scheduled"}
NEWEST LESSON: ${newestModule?.title || "none"}

Return ONLY a JSON array of exactly 3 objects, each with "kind", "title", "body".
- Item 1: kind "focus" — one motivational, discipline-first line for today. Direct, no hype, no emojis.
- Item 2: kind "caution" — what to be careful about this week. Name the specific data releases (CPI, PPI, jobless claims, FOMC, NFP) with their day and time when known, and how volatility around them should change behavior.
- Item 3: kind "ahead" — what's new/coming in the community: live call, newest lesson, review due.

Rules: titles max 5 words. Each body max 240 characters, 1-2 sentences. Never invent economic data that is not listed above. Never give financial advice or predict direction. Plain confident coaching tone.`;

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Lovable-API-Key": lovableKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            input: prompt,
          }),
        });

        if (aiRes.ok) {
          const data = await aiRes.json();
          let text: string = data.output_text || "";
          if (!text && Array.isArray(data.output)) {
            for (const part of data.output) {
              for (const c of part?.content || []) {
                if (c?.type === "output_text" && c.text) text += c.text;
              }
            }
          }
          const match = text.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const cleaned: BriefItem[] = (Array.isArray(parsed) ? parsed : [])
              .filter((i: any) => i?.title && i?.body)
              .slice(0, 3)
              .map((i: any, idx: number) => ({
                kind: (["focus", "caution", "ahead"].includes(i.kind)
                  ? i.kind
                  : (["focus", "caution", "ahead"][idx] as BriefItem["kind"])) as BriefItem["kind"],
                title: String(i.title).slice(0, 40),
                body: String(i.body).slice(0, 260),
              }));
            if (cleaned.length === 3) items = cleaned;
          }
        } else {
          console.error("AI gateway error", aiRes.status, await aiRes.text());
        }
      } catch (e) {
        console.error("AI brief generation failed:", (e as Error).message);
      }
    }

    const keyEvents = (bigEvents.length ? bigEvents : allEvents.slice(0, 6)).map((e: any) => ({
      date: e.date,
      time: fmtTime(e.time_et),
      name: e.event_name,
      impact: e.impact,
    }));

    await admin
      .from("daily_briefs")
      .upsert(
        { user_id: user.id, brief_date: today, items, events: keyEvents },
        { onConflict: "user_id,brief_date" }
      );

    return json({ date: today, items, events: keyEvents, cached: false });
  } catch (err) {
    console.error("morning-brief error:", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});
