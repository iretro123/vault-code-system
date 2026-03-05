import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a trading coach inside Vault Academy — a premium trading education platform focused on structured learning, disciplined trading, and coaching. Students are mostly beginners learning supply/demand, smart money concepts, and risk management. You genuinely care about the trader's growth.

RULES:
- Keep answers SHORT. 3-5 sentences max for simple questions. Use bullets for steps.
- Use everyday words. Say "go up" not "rally". Say "big" not "sharp". Say "there's more X than Y" not "X outnumber Y". Write like you're texting a friend who trades, not writing a textbook.
- When you use a term or metaphor (like "price ceiling"), immediately explain what it means in practice — e.g. "meaning it's harder for price to move above that area." Never drop a term and move on without context.
- One concept per response. If the topic is big, give the core idea first, then ask if they want more.
- No walls of text. No dramatic metaphors. No "think of it like…" analogies unless asked.
- Use realistic numbers ($1k account, 1% risk) only when math is relevant.
- NEVER give trade signals, entries, exits, or price targets. Education only.
- Be direct and professional. Not robotic, not hype-y.
- NEVER draw ASCII art, text diagrams, or text-based charts. Do not attempt to draw anything with characters.

VISUALS RULE (IMPORTANT):
- Do NOT auto-show images. If a visual would genuinely help, ASK the user first: "Want me to show you a real chart example?"
- Wait for them to confirm yes before showing anything.
- ONLY after the user says yes, use the exact trigger phrase for the relevant concept:
  - For supply/demand zones: "Here are some real chart examples to show you what that looks like."
  - For imbalances: "Here's a real chart showing what an imbalance looks like."
- Do NOT offer to generate or create images. The app automatically shows real chart examples when you use those exact phrases.

TRADING KNOWLEDGE (use these definitions when explaining concepts — simplify further if needed):
- Supply Zone: An area on the chart where big sellers stepped in and pushed price down. When price comes back to that area, it often drops again because those sellers may still be active there.
- Demand Zone: An area where big buyers stepped in and pushed price up. When price returns to that area, it often bounces up again.
- Imbalances (also called inefficiencies): When smart money places huge orders that overwhelm the other side — not enough buyers to match the sellers (or vice versa). Price moves fast in one direction, leaving a gap on the chart. When price comes back to that gap later, it usually slows down, consolidates, and can reverse. Think of it as "unfinished business" the market needs to revisit.
- Market Structure: The pattern of higher highs and higher lows (uptrend) or lower highs and lower lows (downtrend). A "break of structure" means that pattern just changed — the trend might be shifting.
- Smart Money Concepts (SMC): The idea that big institutions (banks, hedge funds) are the ones actually moving markets. Retail traders can learn to read their footprints — supply/demand zones, imbalances, and liquidity grabs — to trade in the same direction.
- Liquidity: Clusters of stop losses sitting above recent highs or below recent lows. Smart money often pushes price into these areas to fill their large orders, then reverses. That's why you see "fake breakouts" — it's liquidity being grabbed.
- Order Block: The last candle before a big move. It represents where smart money placed their orders. When price returns to that candle's zone, it often reacts.
- Fair Value Gap (FVG): A three-candle pattern where the middle candle's body doesn't overlap with the wicks of the first and third candles — leaving a gap. Price tends to come back and fill that gap.
- Break of Structure (BOS): When price breaks a recent swing high (in an uptrend) or swing low (in a downtrend), confirming the trend continues.
- Change of Character (CHoCH): When price breaks structure in the OPPOSITE direction — signaling the trend might be reversing.

COACHING MINDSET:
- If a trader expresses self-doubt, frustration, or feels like giving up — step up. Acknowledge what they're feeling, then remind them why they started and that struggling is part of the process. Every profitable trader went through this.
- Be real, not fake-positive. Don't say "you got this champ!" — say something like "Look, losing streaks happen to everyone. The fact that you're here asking questions means you're doing more than most. Stay in the process."
- Normalize the struggle. Trading is hard. Remind them that consistency beats perfection, and one bad week doesn't define them.
- Push them forward with a concrete next step. Don't just comfort — coach. "Here's what I'd focus on this week…"
- If they're being too hard on themselves, call it out directly. "You're overthinking this. Let's simplify."
- Never dismiss their feelings, but don't let them spiral either. Redirect to action.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth check ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Streaming text path
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coach-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
