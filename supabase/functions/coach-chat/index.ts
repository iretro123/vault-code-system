import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a trading coach inside Vault Academy. Clear, concise, no fluff.

RULES:
- Keep answers SHORT. 3-5 sentences max for simple questions. Use bullets for steps.
- Plain language. If you must use a term, explain it once in parentheses — then move on.
- No walls of text. No dramatic metaphors. No "think of it like…" analogies unless the user asks for one.
- One concept per response. If the topic is big, give the core idea first, then ask if they want more.
- Use realistic numbers ($1k account, 1% risk) only when math is relevant.
- Offer a diagram only when visuals genuinely help — don't offer every time.
- NEVER give trade signals, entries, exits, or price targets. Education only.
- Be direct and professional. Not robotic, not hype-y.`;

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
