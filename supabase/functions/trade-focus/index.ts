/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Analytics helpers ── */

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

function winRate(trades: any[]): number {
  if (!trades.length) return 0;
  return Math.round((trades.filter(t => t.risk_reward > 0).length / trades.length) * 100);
}

function complianceRate(trades: any[]): number {
  if (!trades.length) return 0;
  return Math.round((trades.filter(t => t.followed_rules).length / trades.length) * 100);
}

function avgField(trades: any[], field: string): number {
  if (!trades.length) return 0;
  return trades.reduce((s: number, t: any) => s + (Number(t[field]) || 0), 0) / trades.length;
}

function bucketHour(dateStr: string): "morning" | "midday" | "afternoon" | "unknown" {
  try {
    const h = new Date(dateStr).getHours();
    if (h < 11) return "morning";
    if (h < 14) return "midday";
    return "afternoon";
  } catch { return "unknown"; }
}

interface Analytics {
  tradeCount: number;
  dataConfidence: "high" | "medium" | "low";

  // Sizing
  sizingMean: number;
  sizingStdDev: number;
  sizingMin: number;
  sizingMax: number;

  // Revenge sizing
  revengeSizingCount: number;
  revengeSizingAvgIncrease: number;
  hasRevengeSizing: boolean;

  // Overtrading
  avgTradesPerDay: number;
  highCountDays: number;
  highCountDayWinRate: number;
  lowCountDayWinRate: number;
  hasOvertradingPattern: boolean;
  maxTradesPerDay: number;

  // Time of day
  morningWinRate: number;
  morningCount: number;
  middayWinRate: number;
  middayCount: number;
  afternoonWinRate: number;
  afternoonCount: number;

  // Symbol
  symbolStats: { symbol: string; count: number; winRate: number; avgR: number }[];

  // Post-loss
  postLossRuleBreakRate: number;
  postLossEmotionalDrop: number;
  postLossSizingIncrease: number;

  // Plan adherence
  plannedTradeWinRate: number;
  unplannedTradeWinRate: number;
  plannedCount: number;
  unplannedCount: number;

  // R-multiple
  avgWinnerR: number;
  avgLoserR: number;
  bestR: number;
  worstR: number;

  // Rule-breaking
  ruleBreakCount: number;
  ruleBreakCorrelations: string;

  // Progression: recent vs prior
  recentWinRate: number;
  priorWinRate: number;
  recentCompliance: number;
  priorCompliance: number;
  recentAvgRisk: number;
  priorAvgRisk: number;

  // Overall
  overallWinRate: number;
  overallCompliance: number;

  // User rules
  userMaxRiskPerTrade: number | null;
  userMaxTradesPerDay: number | null;
  userMaxDailyLoss: number | null;
}

function computeAnalytics(trades: any[], userRules: any): Analytics {
  const n = trades.length;
  const confidence = n >= 25 ? "high" : n >= 10 ? "medium" : "low";

  // Sizing
  const risks = trades.map(t => Number(t.risk_used) || 0);
  const sizingMean = risks.length ? risks.reduce((a, b) => a + b, 0) / risks.length : 0;

  // Revenge sizing: after each loss, check if next trade's risk > mean * 1.3
  let revengeSizingCount = 0;
  let revengeSizingTotalIncrease = 0;
  for (let i = 0; i < trades.length - 1; i++) {
    if (trades[i].risk_reward < 0 && sizingMean > 0) {
      const nextRisk = Number(trades[i + 1].risk_used) || 0;
      if (nextRisk > sizingMean * 1.3) {
        revengeSizingCount++;
        revengeSizingTotalIncrease += ((nextRisk - sizingMean) / sizingMean) * 100;
      }
    }
  }

  // Overtrading: group by date
  const byDate: Record<string, any[]> = {};
  trades.forEach(t => { (byDate[t.trade_date] ??= []).push(t); });
  const dailyCounts = Object.values(byDate).map(arr => arr.length);
  const avgPerDay = dailyCounts.length ? dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length : 0;
  const configuredMax = userRules?.max_trades_per_day || 3;
  const highDays = Object.entries(byDate).filter(([, arr]) => arr.length > configuredMax);
  const lowDays = Object.entries(byDate).filter(([, arr]) => arr.length <= configuredMax);

  // Time of day
  const byBucket: Record<string, any[]> = { morning: [], midday: [], afternoon: [] };
  trades.forEach(t => {
    const b = bucketHour(t.created_at || t.trade_date);
    if (b !== "unknown") (byBucket[b] ??= []).push(t);
  });

  // Symbol stats
  const bySymbol: Record<string, any[]> = {};
  trades.forEach(t => { if (t.symbol) (bySymbol[t.symbol] ??= []).push(t); });
  const symbolStats = Object.entries(bySymbol)
    .map(([symbol, arr]) => ({
      symbol,
      count: arr.length,
      winRate: winRate(arr),
      avgR: Math.round((arr.reduce((s, t) => {
        const ru = Number(t.risk_used) || 0;
        const rr = Number(t.risk_reward) || 0;
        return s + (ru > 0 ? rr / ru : 0);
      }, 0) / arr.length) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Post-loss behavior
  let postLossCount = 0;
  let postLossRuleBreaks = 0;
  let postLossEmotionalDropSum = 0;
  let postLossSizingIncreaseSum = 0;
  for (let i = 0; i < trades.length - 1; i++) {
    if (trades[i].risk_reward < 0) {
      postLossCount++;
      if (!trades[i + 1].followed_rules) postLossRuleBreaks++;
      const emoDiff = (Number(trades[i + 1].emotional_state) || 5) - (Number(trades[i].emotional_state) || 5);
      postLossEmotionalDropSum += emoDiff;
      if (sizingMean > 0) {
        const sizeDiff = ((Number(trades[i + 1].risk_used) || 0) - sizingMean) / sizingMean;
        postLossSizingIncreaseSum += sizeDiff;
      }
    }
  }

  // Plan adherence
  const planned = trades.filter(t => t.plan_id);
  const unplanned = trades.filter(t => !t.plan_id);

  // R-multiple: compute as risk_reward / risk_used for actual R ratio
  const winners = trades.filter(t => t.risk_reward > 0);
  const losers = trades.filter(t => t.risk_reward < 0);
  const computeR = (t: any): number => {
    const riskUsed = Number(t.risk_used) || 0;
    const rr = Number(t.risk_reward) || 0;
    return riskUsed > 0 ? rr / riskUsed : 0;
  };
  const allR = trades.map(computeR);

  // Rule-breaking correlations
  const ruleBreakers = trades.filter(t => !t.followed_rules);
  let ruleBreakCorr = "";
  if (ruleBreakers.length >= 3) {
    const rbBuckets: Record<string, number> = {};
    ruleBreakers.forEach(t => {
      const b = bucketHour(t.created_at || t.trade_date);
      rbBuckets[b] = (rbBuckets[b] || 0) + 1;
    });
    const worst = Object.entries(rbBuckets).sort((a, b) => b[1] - a[1])[0];
    if (worst) ruleBreakCorr += `${worst[1]}/${ruleBreakers.length} rule breaks in ${worst[0]} session. `;

    const rbSymbols: Record<string, number> = {};
    ruleBreakers.forEach(t => { if (t.symbol) rbSymbols[t.symbol] = (rbSymbols[t.symbol] || 0) + 1; });
    const worstSym = Object.entries(rbSymbols).sort((a, b) => b[1] - a[1])[0];
    if (worstSym && worstSym[1] >= 2) ruleBreakCorr += `${worstSym[1]} rule breaks on ${worstSym[0]}. `;
  }

  // Progression: split into recent half and prior half
  const mid = Math.floor(n / 2);
  const recentHalf = trades.slice(0, mid); // most recent (ordered desc)
  const priorHalf = trades.slice(mid);

  return {
    tradeCount: n,
    dataConfidence: confidence,
    sizingMean: Math.round(sizingMean),
    sizingStdDev: Math.round(stdDev(risks)),
    sizingMin: risks.length ? Math.round(Math.min(...risks)) : 0,
    sizingMax: risks.length ? Math.round(Math.max(...risks)) : 0,
    revengeSizingCount,
    revengeSizingAvgIncrease: revengeSizingCount > 0 ? Math.round(revengeSizingTotalIncrease / revengeSizingCount) : 0,
    hasRevengeSizing: revengeSizingCount >= 3,
    avgTradesPerDay: Math.round(avgPerDay * 10) / 10,
    highCountDays: highDays.length,
    highCountDayWinRate: winRate(highDays.flatMap(([, arr]) => arr)),
    lowCountDayWinRate: winRate(lowDays.flatMap(([, arr]) => arr)),
    hasOvertradingPattern: highDays.length >= 3,
    maxTradesPerDay: configuredMax,
    morningWinRate: winRate(byBucket.morning),
    morningCount: byBucket.morning.length,
    middayWinRate: winRate(byBucket.midday),
    middayCount: byBucket.midday.length,
    afternoonWinRate: winRate(byBucket.afternoon),
    afternoonCount: byBucket.afternoon.length,
    symbolStats,
    postLossRuleBreakRate: postLossCount > 0 ? Math.round((postLossRuleBreaks / postLossCount) * 100) : 0,
    postLossEmotionalDrop: postLossCount > 0 ? Math.round((postLossEmotionalDropSum / postLossCount) * 10) / 10 : 0,
    postLossSizingIncrease: postLossCount > 0 ? Math.round((postLossSizingIncreaseSum / postLossCount) * 100) : 0,
    plannedTradeWinRate: winRate(planned),
    unplannedTradeWinRate: winRate(unplanned),
    plannedCount: planned.length,
    unplannedCount: unplanned.length,
    avgWinnerR: winners.length ? Math.round((winners.reduce((s, t) => s + computeR(t), 0) / winners.length) * 100) / 100 : 0,
    avgLoserR: losers.length ? Math.round((losers.reduce((s, t) => s + computeR(t), 0) / losers.length) * 100) / 100 : 0,
    bestR: allR.length ? Math.round(Math.max(...allR) * 100) / 100 : 0,
    worstR: allR.length ? Math.round(Math.min(...allR) * 100) / 100 : 0,
    ruleBreakCount: ruleBreakers.length,
    ruleBreakCorrelations: ruleBreakCorr || "No clear pattern yet.",
    recentWinRate: winRate(recentHalf),
    priorWinRate: winRate(priorHalf),
    recentCompliance: complianceRate(recentHalf),
    priorCompliance: complianceRate(priorHalf),
    recentAvgRisk: Math.round(avgField(recentHalf, "risk_used")),
    priorAvgRisk: Math.round(avgField(priorHalf, "risk_used")),
    overallWinRate: winRate(trades),
    overallCompliance: complianceRate(trades),
    userMaxRiskPerTrade: userRules?.max_risk_per_trade ?? null,
    userMaxTradesPerDay: userRules?.max_trades_per_day ?? null,
    userMaxDailyLoss: userRules?.max_daily_loss ?? null,
  };
}

function buildSystemPrompt(a: Analytics): string {
  return `You are a trading performance auditor analyzing a trader's behavioral data. You have pre-computed analytics — DO NOT recalculate or estimate. Use ONLY the numbers provided.

CRITICAL RULES:
1. Every sentence MUST reference a specific number, percentage, or count from the data below.
2. If dataConfidence is "low" (<10 trades), return brief, forward-looking copy. For primaryLeak: "Building your trading profile. More trades needed for reliable leak detection." For strongestEdge: "Early data looks promising. A few more trades will confirm your strongest patterns." Do NOT use negative phrasing like "insufficient" or "not enough data."
3. If a confidence flag (hasRevengeSizing, hasOvertradingPattern) is false, do NOT claim that pattern exists. Say "Not enough evidence yet."
4. NO motivational language. NO filler. NO generic advice like "stay disciplined" or "keep improving."
5. Sound like a performance auditor reviewing a trading operation. Direct. Factual. Evidence-based.
6. For primaryLeak: identify the single biggest performance killer. Include what, why, the data, and the exact fix.
7. For strongestEdge: identify what is actually working and why, with numbers.
8. For nextAction: give ONE specific, measurable action for the next session. Not vague.

═══ PRE-COMPUTED ANALYTICS (${a.tradeCount} trades, confidence: ${a.dataConfidence}) ═══

SIZING:
- Mean risk: $${a.sizingMean} | Std dev: $${a.sizingStdDev} | Range: $${a.sizingMin}-$${a.sizingMax}
- Revenge sizing instances (>30% above avg after loss): ${a.revengeSizingCount} ${a.hasRevengeSizing ? "(CONFIRMED PATTERN)" : "(below threshold)"}
- Avg revenge increase: ${a.revengeSizingAvgIncrease}%

OVERTRADING:
- Avg trades/day: ${a.avgTradesPerDay} | User limit: ${a.maxTradesPerDay}
- Days exceeding limit: ${a.highCountDays} ${a.hasOvertradingPattern ? "(CONFIRMED PATTERN)" : "(below threshold)"}
- Win rate on high-count days: ${a.highCountDayWinRate}% vs low-count days: ${a.lowCountDayWinRate}%

TIME OF DAY:
- Morning (<11AM): ${a.morningCount} trades, ${a.morningWinRate}% win rate
- Midday (11AM-2PM): ${a.middayCount} trades, ${a.middayWinRate}% win rate
- Afternoon (2PM+): ${a.afternoonCount} trades, ${a.afternoonWinRate}% win rate

SYMBOL PERFORMANCE:
${a.symbolStats.map(s => `- ${s.symbol}: ${s.count} trades, ${s.winRate}% win rate, avg R: ${s.avgR}`).join("\n")}

POST-LOSS BEHAVIOR:
- Rule break rate after losses: ${a.postLossRuleBreakRate}%
- Avg emotional state change after loss: ${a.postLossEmotionalDrop}
- Avg sizing change after loss: ${a.postLossSizingIncrease > 0 ? "+" : ""}${a.postLossSizingIncrease}%

PLAN ADHERENCE:
- Planned trades: ${a.plannedCount} (${a.plannedTradeWinRate}% win rate)
- Unplanned trades: ${a.unplannedCount} (${a.unplannedTradeWinRate}% win rate)
- Delta: ${a.plannedTradeWinRate - a.unplannedTradeWinRate > 0 ? "+" : ""}${a.plannedTradeWinRate - a.unplannedTradeWinRate}% win rate advantage for planned trades

R-MULTIPLE:
- Avg winner: ${a.avgWinnerR}R | Avg loser: ${a.avgLoserR}R
- Best: ${a.bestR}R | Worst: ${a.worstR}R

RULE COMPLIANCE:
- Overall: ${a.overallCompliance}% | Rule breaks: ${a.ruleBreakCount}
- Correlations: ${a.ruleBreakCorrelations}

PROGRESSION (recent half vs prior half):
- Win rate: ${a.recentWinRate}% vs ${a.priorWinRate}% (${a.recentWinRate - a.priorWinRate > 0 ? "+" : ""}${a.recentWinRate - a.priorWinRate}%)
- Compliance: ${a.recentCompliance}% vs ${a.priorCompliance}% (${a.recentCompliance - a.priorCompliance > 0 ? "+" : ""}${a.recentCompliance - a.priorCompliance}%)
- Avg risk: $${a.recentAvgRisk} vs $${a.priorAvgRisk}

${a.userMaxRiskPerTrade ? `USER CONFIGURED RULES: Max risk/trade: ${a.userMaxRiskPerTrade}% | Max trades/day: ${a.userMaxTradesPerDay} | Max daily loss: ${a.userMaxDailyLoss}%` : ""}`;
}

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

    // ── Fetch all data in parallel ──
    const [tradesRes, rulesRes, vaultRes] = await Promise.all([
      admin.from("trade_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      admin.from("trading_rules").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("vault_state").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(1),
    ]);

    const trades = tradesRes.data || [];
    const userRules = rulesRes.data;
    const vaultState = vaultRes.data?.[0] || null;

    if (tradesRes.error) console.error("Trade fetch error:", tradesRes.error);

    if (trades.length < 3) {
      return new Response(
        JSON.stringify({ error: "Need at least 3 trades" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Compute analytics server-side ──
    const analytics = computeAnalytics(trades, userRules);

    // ── Build vault context ──
    let vaultContext = "";
    if (vaultState) {
      vaultContext = `\nVAULT STATE: Status: ${vaultState.vault_status} | Loss streak: ${vaultState.loss_streak} | Risk remaining: $${Number(vaultState.risk_remaining_today).toFixed(0)} | Risk mode: ${vaultState.risk_mode}`;
    }

    const systemPrompt = buildSystemPrompt(analytics) + vaultContext;

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
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Analyze the pre-computed trading analytics and identify the primary performance leak, strongest edge, next action, progress trend, and assign a risk grade." },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "trading_intelligence",
                description: "Return structured performance intelligence based on pre-computed behavioral analytics.",
                parameters: {
                  type: "object",
                  properties: {
                    primaryLeak: {
                      type: "string",
                      description: "The #1 performance killer. Structure: WHAT is happening → WHY it matters → THE EVIDENCE (cite specific numbers) → THE FIX (exact corrective action). 3-4 sentences max. If dataConfidence is low, say 'Building your trading profile. More trades needed for reliable leak detection.' Do NOT invent patterns.",
                    },
                    primaryLeakConfidence: {
                      type: "string",
                      enum: ["high", "medium", "insufficient"],
                      description: "high = confirmed pattern with 3+ instances. medium = emerging pattern. insufficient = not enough data.",
                    },
                    strongestEdge: {
                      type: "string",
                      description: "What is actually working for this trader, with numbers as evidence. 2-3 sentences. If dataConfidence is low, say 'Early data looks promising. A few more trades will confirm your strongest patterns.'",
                    },
                    nextAction: {
                      type: "string",
                      description: "ONE specific, measurable action for the next trading session. Must be concrete enough to verify (e.g., 'Cap at 2 trades today' not 'Be more disciplined'). One sentence.",
                    },
                    progressVerdict: {
                      type: "string",
                      description: "Comparing recent performance vs prior: is the trader improving, declining, or flat? Reference the specific win rate, compliance, and risk deltas. 2 sentences max.",
                    },
                    riskGrade: {
                      type: "string",
                      enum: ["A", "B", "C", "D", "F"],
                      description: "A = excellent risk management (high compliance, consistent sizing, no revenge trading). B = solid with minor issues. C = concerning patterns. D = multiple risk issues. F = critical risk behavior.",
                    },
                  },
                  required: ["primaryLeak", "primaryLeakConfidence", "strongestEdge", "nextAction", "progressVerdict", "riskGrade"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "trading_intelligence" },
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

    // Attach server-computed metadata
    analysis.dataDepth = analytics.tradeCount;
    analysis.dataConfidence = analytics.dataConfidence;

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
