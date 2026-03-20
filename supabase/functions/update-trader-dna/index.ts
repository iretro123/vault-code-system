import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Fetch context: last 30 trades, journal entries, vault state, existing DNA
    const [tradesRes, journalRes, vaultRes, dnaRes] = await Promise.all([
      serviceClient
        .from("trade_entries")
        .select("trade_date, symbol, risk_used, risk_reward, followed_rules, notes, outcome, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      serviceClient
        .from("journal_entries")
        .select("entry_date, ticker, followed_rules, biggest_mistake, lesson")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      serviceClient
        .from("vault_state")
        .select("account_balance, risk_mode, vault_status, loss_streak")
        .eq("user_id", user.id)
        .maybeSingle(),
      serviceClient
        .from("trader_dna")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const trades = tradesRes.data || [];
    const journals = journalRes.data || [];
    const vault = vaultRes.data;
    const existingDna = dnaRes.data as any;

    if (trades.length < 3) {
      return new Response(JSON.stringify({ message: "Not enough trades for analysis", min_required: 3 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build analysis prompt
    const tradesSummary = trades.map((t: any) => {
      const pnl = t.outcome ? t.risk_reward : t.risk_reward * t.risk_used;
      return `${t.trade_date} | ${t.symbol || "N/A"} | ${pnl >= 0 ? "WIN" : "LOSS"} $${Math.abs(pnl).toFixed(0)} | Rules: ${t.followed_rules ? "Y" : "N"} | ${(t.notes || "").slice(0, 60)}`;
    }).join("\n");

    const journalSummary = journals.map((j: any) =>
      `${j.entry_date} | ${j.ticker || "N/A"} | Rules: ${j.followed_rules ? "Y" : "N"} | Mistake: ${(j.biggest_mistake || "—").slice(0, 60)} | Lesson: ${(j.lesson || "—").slice(0, 60)}`
    ).join("\n");

    const existingContext = existingDna
      ? `Previous strengths: ${JSON.stringify(existingDna.strengths)}\nPrevious weaknesses: ${JSON.stringify(existingDna.weaknesses)}\nPrevious personality tags: ${JSON.stringify(existingDna.personality_tags)}`
      : "No previous analysis exists.";

    const prompt = `Analyze this trader's recent activity and build/update their profile.

TRADES (newest first):
${tradesSummary}

JOURNAL ENTRIES:
${journalSummary || "None"}

VAULT STATE: Balance $${vault?.account_balance || 0}, Mode: ${vault?.risk_mode || "N/A"}, Status: ${vault?.vault_status || "N/A"}, Loss streak: ${vault?.loss_streak || 0}

${existingContext}

IMPORTANT: Accumulate insights — don't discard previous findings. Merge new patterns with old ones.`;

    // Call AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a trading psychology and performance analyst. Analyze trader data and extract behavioral patterns. Be specific and data-driven. Reference actual trades when possible.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "update_trader_profile",
              description: "Update the trader's DNA profile with analyzed patterns",
              parameters: {
                type: "object",
                properties: {
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 specific behavioral strengths observed (e.g., 'Consistent rule compliance on winning days')",
                  },
                  weaknesses: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 specific behavioral weaknesses/leaks (e.g., 'Increases position size after losses')",
                  },
                  personality_tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-6 short personality labels (e.g., 'patient', 'revenge-prone', 'morning-focused')",
                  },
                  summary: {
                    type: "string",
                    description: "2-3 sentence overall assessment of this trader's current state",
                  },
                  risk_recommendation: {
                    type: "string",
                    description: "One-line recommendation about their risk management",
                  },
                },
                required: ["strengths", "weaknesses", "personality_tags", "summary", "risk_recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "update_trader_profile" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI returned no structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    const newVersion = (existingDna?.insights_version || 0) + 1;

    // Upsert trader_dna
    const { error: upsertError } = await serviceClient
      .from("trader_dna")
      .upsert({
        user_id: user.id,
        trading_style: existingDna?.trading_style || "day_trader",
        instruments: existingDna?.instruments || ["options"],
        experience_level: existingDna?.experience_level || "beginner",
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        personality_tags: analysis.personality_tags,
        insights_version: newVersion,
        last_analyzed_at: new Date().toISOString(),
        raw_profile: {
          ...((existingDna?.raw_profile as any) || {}),
          latest_summary: analysis.summary,
          latest_risk_rec: analysis.risk_recommendation,
          analysis_history: [
            ...((existingDna?.raw_profile as any)?.analysis_history || []).slice(-4),
            {
              version: newVersion,
              date: new Date().toISOString(),
              summary: analysis.summary,
              trades_analyzed: trades.length,
            },
          ],
        },
      });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to save analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, version: newVersion, analysis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-trader-dna error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
