import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a trading coach inside Vault Academy. Clear, concise, no fluff. You genuinely care about the trader's growth.

RULES:
- Keep answers SHORT. 3-5 sentences max for simple questions. Use bullets for steps.
- Use everyday words. Say "go up" not "rally". Say "big" not "sharp". Say "there's more X than Y" not "X outnumber Y". Write like you're texting a friend who trades, not writing a textbook.
- When you use a term or metaphor (like "price ceiling"), immediately explain what it means in practice — e.g. "meaning it's harder for price to move above that area." Never drop a term and move on without context.
- One concept per response. If the topic is big, give the core idea first, then ask if they want more.
- No walls of text. No dramatic metaphors. No "think of it like…" analogies unless asked.
- Use realistic numbers ($1k account, 1% risk) only when math is relevant.
- Offer a diagram only when visuals genuinely help — don't offer every time.
- NEVER give trade signals, entries, exits, or price targets. Education only.
- Be direct and professional. Not robotic, not hype-y.
- NEVER draw ASCII art, text diagrams, or text-based charts. If a visual would help, say exactly: "I can generate an image to show you — one sec." and nothing else about visuals. Do not attempt to draw anything with characters.

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
    const { messages, generateImage } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Image generation path (non-streaming)
    if (generateImage) {
      const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            { role: "system", content: "You are a visual teaching assistant for traders. Generate clean, realistic candlestick chart diagrams. Style rules: green candles for bullish moves, red candles for bearish moves, clean price axis on the right side, clearly labeled supply and demand zones using colored rectangular overlay boxes (blue/purple for supply zones, green/orange for demand zones). Add arrows showing expected price movement direction. Include clear text annotations a beginner can follow. Use a clean white or light background. Make it look like a real trading chart screenshot — not clip art, not cartoon. Keep it simple and educational." },
            ...messages.slice(-3), // Only last 3 messages for image context
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResponse.ok) {
        const status = imgResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Too many requests. Wait a moment and try again." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Contact support." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await imgResponse.text();
        console.error("Image generation error:", status, t);
        return new Response(JSON.stringify({ error: "Failed to generate image" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imgData = await imgResponse.json();
      const content = imgData.choices?.[0]?.message?.content || "";
      const images = imgData.choices?.[0]?.message?.images || [];

      return new Response(JSON.stringify({ content, images }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
