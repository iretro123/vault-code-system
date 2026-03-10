import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Fetch last 20 trades using service role
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: trades, error: tradeErr } = await admin
      .from("trade_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (tradeErr) {
      console.error("Trade fetch error:", tradeErr);
      return new Response(JSON.stringify({ error: "Failed to load trades" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!trades || trades.length < 3) {
      return new Response(
        JSON.stringify({ error: "Need at least 3 trades" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build trade summary for AI
    const tradeSummary = trades.map((t: any, i: number) => {
      const pnl = t.risk_reward * t.risk_used;
      const outcome = t.risk_reward > 0 ? "WIN" : t.risk_reward < 0 ? "LOSS" : "BREAKEVEN";
      return `Trade ${i + 1}: ${t.trade_date} | ${outcome} | P/L: $${pnl.toFixed(0)} | Rules followed: ${t.followed_rules ? "Yes" : "No"} | Emotional state: ${t.emotional_state}/10 | Notes: ${t.notes || "none"}`;
    }).join("\n");

    const systemPrompt = `You are an elite trading mentor analyzing a student's recent trade log. Your job is to identify their biggest recurring mistake, give them ONE specific rule to follow on their next trade, spot a behavioral pattern, and offer genuine encouragement.

Be specific and reference their actual data. Don't be generic. If they're doing well, acknowledge it. If they're struggling, be honest but supportive. Keep each field to 1-2 sentences max.

Here are their last ${trades.length} trades:
${tradeSummary}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Analyze my recent trades and give me focused feedback for my next session." },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "trade_focus_analysis",
                description:
                  "Return structured mentor feedback based on the student's trade log.",
                parameters: {
                  type: "object",
                  properties: {
                    topMistake: {
                      type: "string",
                      description: "The most common error pattern found in their trades (1-2 sentences)",
                    },
                    focusRule: {
                      type: "string",
                      description: "A specific actionable rule for their next trade (1 sentence)",
                    },
                    pattern: {
                      type: "string",
                      description: "A behavioral pattern observed across their trades (1-2 sentences)",
                    },
                    encouragement: {
                      type: "string",
                      description: "One line of genuine coaching encouragement based on their data",
                    },
                  },
                  required: ["topMistake", "focusRule", "pattern", "encouragement"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "trade_focus_analysis" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI returned invalid format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trade-focus error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
