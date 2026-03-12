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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // ── Fetch all pipeline data in parallel ──
    const [tradesRes, journalRes, plansRes, vaultRes, sessionsRes, checklistRes] = await Promise.all([
      admin.from("trade_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      admin.from("journal_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      admin.from("approved_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      admin.from("vault_state").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(1),
      admin.from("vault_focus_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      admin.from("vault_daily_checklist").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(10),
    ]);

    const trades = tradesRes.data || [];
    const journals = journalRes.data || [];
    const plans = plansRes.data || [];
    const vaultState = vaultRes.data?.[0] || null;
    const focusSessions = sessionsRes.data || [];
    const checklists = checklistRes.data || [];

    if (tradesRes.error) console.error("Trade fetch error:", tradesRes.error);

    if (!trades || trades.length < 3) {
      return new Response(
        JSON.stringify({ error: "Need at least 3 trades" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build trade summary ──
    const tradeSummary = trades.map((t: any, i: number) => {
      const pnl = t.risk_reward * t.risk_used;
      const outcome = t.risk_reward > 0 ? "WIN" : t.risk_reward < 0 ? "LOSS" : "BREAKEVEN";
      return `Trade ${i + 1}: ${t.trade_date} | ${outcome} | P/L: $${pnl.toFixed(0)} | Rules followed: ${t.followed_rules ? "Yes" : "No"} | Emotional state: ${t.emotional_state}/10 | Symbol: ${t.symbol || "N/A"} | Notes: ${t.notes || "none"}`;
    }).join("\n");

    const wins = trades.filter((t: any) => t.risk_reward > 0).length;
    const winRate = Math.round((wins / trades.length) * 100);
    const compliant = trades.filter((t: any) => t.followed_rules).length;
    const complianceRate = Math.round((compliant / trades.length) * 100);

    // ── Build journal summary ──
    let journalSummary = "No journal entries available.";
    if (journals.length > 0) {
      const journalCompliant = journals.filter((j: any) => j.followed_rules).length;
      const journalComplianceRate = Math.round((journalCompliant / journals.length) * 100);
      journalSummary = `Journal entries analyzed: ${journals.length} | Journal compliance: ${journalComplianceRate}%\n`;
      journalSummary += journals.slice(0, 5).map((j: any, i: number) => {
        return `Journal ${i + 1}: ${j.entry_date} | Ticker: ${j.ticker || "N/A"} | Followed rules: ${j.followed_rules ? "Yes" : "No"} | Mistake: ${j.biggest_mistake || "none"} | Lesson: ${j.lesson || "none"} | What happened: ${j.what_happened || "none"}`;
      }).join("\n");
    }

    // ── Build plan execution summary ──
    let planSummary = "No approved plans available.";
    if (plans.length > 0) {
      const logged = plans.filter((p: any) => p.status === "logged").length;
      const cancelled = plans.filter((p: any) => p.status === "cancelled").length;
      const planned = plans.filter((p: any) => p.status === "planned").length;
      const executionRate = Math.round((logged / plans.length) * 100);
      planSummary = `Plans analyzed: ${plans.length} | Logged: ${logged} | Cancelled: ${cancelled} | Still planned: ${planned} | Execution rate: ${executionRate}%\n`;
      planSummary += plans.slice(0, 5).map((p: any, i: number) => {
        return `Plan ${i + 1}: ${p.ticker || "N/A"} ${p.direction} | ${p.contracts_planned} contracts | Max loss: $${Number(p.max_loss_planned).toFixed(0)} | Status: ${p.status} | Approval: ${p.approval_status}`;
      }).join("\n");
    }

    // ── Build vault state summary ──
    let vaultSummary = "No vault state available for today.";
    if (vaultState) {
      vaultSummary = `Current vault status: ${vaultState.vault_status} | Loss streak: ${vaultState.loss_streak} | Risk remaining today: $${Number(vaultState.risk_remaining_today).toFixed(0)} | Trades remaining today: ${vaultState.trades_remaining_today} | Risk mode: ${vaultState.risk_mode} | Session paused: ${vaultState.session_paused ? "Yes" : "No"}`;
    }

    // ── Build focus session / attendance summary ──
    let attendanceSummary = "No focus session data available.";
    if (focusSessions.length > 0) {
      const completed = focusSessions.filter((s: any) => s.status === "COMPLETED").length;
      const abandoned = focusSessions.filter((s: any) => s.status === "ABANDONED" || s.status === "EXPIRED").length;
      const active = focusSessions.filter((s: any) => s.status === "ACTIVE").length;
      const completionRate = Math.round((completed / focusSessions.length) * 100);
      const avgDuration = Math.round(focusSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0) / focusSessions.length);
      attendanceSummary = `Focus sessions analyzed: ${focusSessions.length} | Completed: ${completed} | Abandoned/Expired: ${abandoned} | Active: ${active} | Completion rate: ${completionRate}% | Avg duration: ${avgDuration}min\n`;
      attendanceSummary += focusSessions.slice(0, 5).map((s: any, i: number) => {
        return `Session ${i + 1}: ${s.started_at?.slice(0, 10)} | ${s.duration_minutes}min | Status: ${s.status} | Trades taken: ${s.trades_taken}/${s.max_trades} | Goals: ${s.goals || "none"}`;
      }).join("\n");
    }

    const systemPrompt = `You are an elite trading mentor analyzing a student's complete behavioral profile. You have access to their trade log, journal reflections, trade plan execution history, vault/risk state, and focus session attendance. Your job is to give SPECIFIC, data-driven feedback — never generic advice.

IMPORTANT RULES:
- Reference their ACTUAL data. Cite specific trades, patterns, tickers, dates.
- If they keep making the same mistake in their journal, call it out.
- If they cancel plans frequently, address plan discipline.
- If their vault is in RED or YELLOW, factor that into sizing advice.
- If they don't follow rules consistently, be direct about it.
- If they abandon focus sessions or don't complete them, address session discipline.
- Keep each field to 1-2 sentences max. Be concise and impactful.

═══ TRADE LOG (${trades.length} trades) ═══
Stats: Win rate: ${winRate}%, Compliance: ${complianceRate}%
${tradeSummary}

═══ JOURNAL REFLECTIONS ═══
${journalSummary}

═══ PLAN EXECUTION ═══
${planSummary}

═══ VAULT STATE ═══
${vaultSummary}

═══ FOCUS SESSION ATTENDANCE ═══
${attendanceSummary}`;

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
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Analyze my complete trading profile — trades, journal, plan execution, vault state, and session attendance — and give me targeted feedback for my next session." },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "trade_focus_analysis",
                description: "Return structured mentor feedback based on the student's complete behavioral profile.",
                parameters: {
                  type: "object",
                  properties: {
                    topMistake: { type: "string", description: "The most common error pattern found across their trades AND journal entries (1-2 sentences, reference specific data)" },
                    focusRule: { type: "string", description: "A specific actionable rule for their next trade based on their weakest area (1 sentence)" },
                    pattern: { type: "string", description: "A behavioral pattern observed across trades, journal, and plan execution (1-2 sentences)" },
                    encouragement: { type: "string", description: "One line of genuine coaching encouragement based on their actual progress and data" },
                    sizingAdvice: { type: "string", description: "Position sizing recommendation factoring in vault status, loss streak, and recent performance (1-2 sentences)" },
                    nextSessionTip: { type: "string", description: "A specific preparation tip for their next session based on their journal lessons and recurring mistakes (1 sentence)" },
                    disciplineScore: { type: "string", enum: ["strong", "moderate", "weak"], description: "Overall discipline rating based on rules compliance rate, plan execution rate, and journal consistency" },
                    riskAssessment: { type: "string", description: "1-sentence assessment of their current risk behavior based on vault state, sizing patterns, and loss streaks" },
                    attendanceInsight: { type: "string", description: "1-sentence observation about their session discipline — do they complete focus sessions, show up consistently, or abandon early? Reference actual completion rates." },
                  },
                  required: ["topMistake", "focusRule", "pattern", "encouragement", "sizingAdvice", "nextSessionTip", "disciplineScore", "riskAssessment", "attendanceInsight"],
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
