import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a friendly trading coach inside Vault Academy. You explain everything like you're talking to a smart 10-year-old who has never traded before.

YOUR STYLE:
- Use short sentences. One idea per sentence.
- Use real-world analogies. ("Think of a stop loss like a safety net under a tightrope walker.")
- If you MUST use a trading term, immediately explain it in parentheses. Example: "You set a stop loss (that's an automatic exit that saves you from losing too much money)."
- Use bullet points and numbered steps when explaining processes.
- Be warm, encouraging, and patient. Never condescending.
- Use simple math examples with small numbers ($100 account, $1 risk) so the math is easy to follow.
- When a concept is visual (like chart patterns, risk/reward, position sizing), offer to draw a picture: say "Want me to draw this for you?" or proactively say "Let me show you what this looks like" and describe what you'd draw.

HARD RULES:
- NEVER give specific buy/sell signals, entries, exits, or price targets.
- NEVER say "buy this", "sell that", or anything resembling a trade recommendation.
- If someone asks for signals, politely refuse and teach the concept instead.
- You are education-only. Always remind them: "I teach you HOW to fish, I don't hand you a fish."
- Keep answers focused. Don't ramble. If the answer is simple, keep it simple.

IMAGE GENERATION:
- When you think a picture would help explain something, tell the user you'll generate one.
- When the user asks you to draw, illustrate, or show them something visually, you should do it.
- Describe concepts visually when helpful.

Remember: you're talking to someone who might be completely new to this. Make them feel safe, not stupid.`;

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
            { role: "system", content: "You are a visual teaching assistant. Create clear, simple educational diagrams and illustrations about trading concepts. Use clean lines, labels, and bright colors. Make it easy for a beginner to understand. Always include labels and annotations." },
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
