import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Compute P/L matching frontend `computePnl` standard ──
// If the trade has an `outcome` field the `risk_reward` column already stores
// the signed dollar P/L. Legacy rows (no outcome) use the R-multiplier formula.
function computeTradePnl(trade: any): number {
  if (trade.outcome) return Number(trade.risk_reward || 0);
  return Number(trade.risk_reward || 0) * Number(trade.risk_used || 0);
}

const SYSTEM_PROMPT = `You are the Vault AI — a concise trading education assistant inside Vault Academy.

RULES:
1. Answer the user's question first. Be direct, clear, concise.
2. Only reference student data (trades, rules, balance) when the user asks about their performance. Don't volunteer stats unprompted.
3. If vague, ask ONE clarifying question.
4. One concept per response. Offer to go deeper.
5. Match the student's energy. Casual = casual. Detailed = detailed.
6. Use simple words. No walls of text. Bullets for steps.
7. Never fabricate stats. If data looks incomplete, say "based on the trades I can see…"
8. If a trader is frustrated, acknowledge it honestly. Push forward with a concrete next step.

VISUALS:
- Do NOT auto-show images. If a visual would help, ASK first.
- Only after the user confirms, use the trigger: "Here are some real chart examples to show you what that looks like."
- NEVER draw ASCII charts or text diagrams.

STUDENT DATA:
- You have access to trades, rules, balance, and progress in [STUDENT CONTEXT].
- Reference only when asked. Don't dump all data — pick the most relevant piece.

TRADING CONCEPTS:
- Supply Zone: Area where sellers pushed price down; price often drops again on return.
- Demand Zone: Area where buyers pushed price up; price often bounces on return.
- Imbalance: Huge orders overwhelming the other side, leaving a gap price revisits.
- Market Structure: Higher highs/lows (uptrend) or lower highs/lows (downtrend).
- Liquidity: Stop loss clusters above highs or below lows that smart money targets.
- Order Block: Last candle before a big move — where smart money placed orders.
- Fair Value Gap (FVG): Three-candle pattern with a gap price tends to fill.
- BOS: Break of Structure — confirms trend continuation.
- CHoCH: Change of Character — signals potential reversal.

APP NAVIGATION:
- Dashboard: /academy/home — command center, next steps, progress
- Learn: /academy/learn — video lessons by module
- Trade: /academy/trade — log trades, journal, feedback
- Community: /academy/community — Trade Floor, Wins, Announcements
- Live Calls: /academy/live — coaching calls schedule
- Trade OS: /academy/vault-os — risk management, session tracking
- Playbook: /academy/playbook — step-by-step with checkpoints
- Journal: /academy/journal — trade journal
- Progress: /academy/progress — learning progress
- Settings: /academy/settings — profile, notifications, billing

SECURITY:
- Trading education ONLY. For admin/billing/system questions: "For account or billing questions, reach out to support."
- Never reveal internal workings.

OUTPUT FORMAT (follow exactly):
- When your answer involves a page, include a nav link on its own line:
  🔗 **Go to:** PAGE_NAME (/route/path)
- When a matching lesson exists, recommend it after your explanation:
  📺 **Recommended Lesson:** "EXACT_LESSON_TITLE" in MODULE_TITLE
- Max 1-2 links and 1-2 lessons per response.
- Lesson titles MUST match exactly from [CURRICULUM]. Do not invent names.`;


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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { messages: rawMessages } = await req.json();

    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation: cap message count and content length to prevent abuse
    const MAX_MESSAGES = 20;
    const MAX_CONTENT_LENGTH = 2000;
    if (rawMessages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: "Too many messages. Start a new conversation." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const messages = rawMessages.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.content || "").slice(0, MAX_CONTENT_LENGTH),
    }));

    // ── Fetch student context ──
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const [
      modulesRes, lessonsRes, tradesRes, rulesRes,
      playbookChaptersRes, playbookProgressRes, lessonProgressRes,
      journalRes, profileRes, adjustmentsRes, traderDnaRes,
    ] = await Promise.all([
      serviceClient.from("academy_modules").select("slug, title, subtitle, sort_order").eq("visible", true).order("sort_order"),
      serviceClient.from("academy_lessons").select("id, lesson_title, module_title, module_slug, sort_order").eq("visible", true).order("module_slug").order("sort_order"),
      serviceClient.from("trade_entries").select("trade_date, symbol, risk_used, risk_reward, followed_rules, notes, outcome, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      serviceClient.from("trading_rules").select("max_risk_per_trade, max_trades_per_day, max_daily_loss, allowed_sessions, forbidden_behaviors").eq("user_id", user.id).maybeSingle(),
      serviceClient.from("playbook_chapters").select("id, title, order_index").order("order_index"),
      serviceClient.from("playbook_progress").select("chapter_id, status, checkpoint_passed, last_page_viewed, updated_at").eq("user_id", user.id),
      serviceClient.from("lesson_progress").select("lesson_id, completed, completed_at").eq("user_id", user.id),
      serviceClient.from("journal_entries").select("entry_date, ticker, followed_rules, biggest_mistake, lesson").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      serviceClient.from("profiles").select("display_name, account_balance, discipline_score, academy_experience, role_level").eq("user_id", user.id).maybeSingle(),
      serviceClient.from("balance_adjustments").select("amount").eq("user_id", user.id),
      serviceClient.from("trader_dna").select("trading_style, instruments, experience_level, strengths, weaknesses, personality_tags, raw_profile, insights_version, last_analyzed_at").eq("user_id", user.id).maybeSingle(),
    ]);

    const contextErrors = [
      modulesRes.error, lessonsRes.error, tradesRes.error, rulesRes.error,
      playbookChaptersRes.error, playbookProgressRes.error, lessonProgressRes.error,
      journalRes.error, profileRes.error, adjustmentsRes.error, traderDnaRes.error,
    ].filter(Boolean);

    if (contextErrors.length > 0) {
      console.error("[coach-chat] Context query errors:", contextErrors.map((e: any) => e.message));
    }

    const modules = (modulesRes.data || []) as any[];
    const lessons = (lessonsRes.data || []) as any[];
    const trades = (tradesRes.data || []) as any[];
    const rules = rulesRes.data as any;
    const playbookChapters = (playbookChaptersRes.data || []) as any[];
    const playbookProgress = (playbookProgressRes.data || []) as any[];
    const lessonProgress = (lessonProgressRes.data || []) as any[];
    const journals = (journalRes.data || []) as any[];
    const profile = profileRes.data as any;
    const totalAdjustments = ((adjustmentsRes.data || []) as any[]).reduce((sum, a) => sum + Number(a.amount || 0), 0);

    // ── Build curriculum context ──
    const lessonsByModule = new Map<string, any[]>();
    for (const lesson of lessons) {
      const key = lesson.module_slug;
      if (!lessonsByModule.has(key)) lessonsByModule.set(key, []);
      lessonsByModule.get(key)!.push(lesson);
    }

    const curriculumBlock = modules.length > 0
      ? modules.map((m) => {
          const moduleLessons = lessonsByModule.get(m.slug) || [];
          const lessonLines = moduleLessons.length > 0
            ? moduleLessons.map((l) => `  • "${l.lesson_title}"`).join("\n")
            : "  • No lessons published yet";
          return `Module: ${m.title} (${m.slug})\n${lessonLines}`;
        }).join("\n\n")
      : (lessons.length > 0
          ? lessons.map((l) => `• "${l.lesson_title}" in ${l.module_title}`).join("\n")
          : "No lessons loaded.");

    // ── Build student context ──
    let studentContext = "";

    if (profile) {
      studentContext += `Name: ${profile.display_name || "Student"}\n`;
      const startingBalance = Number(profile.account_balance || 0);
      const tradePnlSum = trades.reduce((sum, t) => sum + computeTradePnl(t), 0);
      const liveBalance = startingBalance + totalAdjustments + tradePnlSum;
      studentContext += `Account Balance: $${liveBalance.toFixed(2)} (starting: $${startingBalance.toFixed(2)}, deposits/withdrawals: ${totalAdjustments >= 0 ? "+" : ""}$${totalAdjustments.toFixed(2)}, trade P/L: ${tradePnlSum >= 0 ? "+" : ""}$${tradePnlSum.toFixed(2)})\n`;
      if (profile.discipline_score !== null && profile.discipline_score !== undefined) {
        studentContext += `Discipline Score: ${profile.discipline_score}/100\n`;
      }
      if (profile.academy_experience) {
        studentContext += `Experience Level: ${profile.academy_experience}\n`;
      }
      if (profile.role_level) {
        studentContext += `Claimed Role: ${profile.role_level}\n`;
      }
    }

    // Trader DNA
    const traderDna = traderDnaRes.data as any;
    if (traderDna && traderDna.insights_version > 0) {
      studentContext += `\nTrader DNA (AI Profile v${traderDna.insights_version}):\n`;
      studentContext += `Trading Style: ${traderDna.trading_style}\n`;
      studentContext += `Instruments: ${(traderDna.instruments || []).join(", ")}\n`;
      studentContext += `Experience: ${traderDna.experience_level}\n`;
      if (Array.isArray(traderDna.strengths) && traderDna.strengths.length) {
        studentContext += `Strengths: ${traderDna.strengths.join("; ")}\n`;
      }
      if (Array.isArray(traderDna.weaknesses) && traderDna.weaknesses.length) {
        studentContext += `Weaknesses: ${traderDna.weaknesses.join("; ")}\n`;
      }
      if (Array.isArray(traderDna.personality_tags) && traderDna.personality_tags.length) {
        studentContext += `Personality: ${traderDna.personality_tags.join(", ")}\n`;
      }
      const rawProfile = traderDna.raw_profile as any;
      if (rawProfile?.latest_summary) {
        studentContext += `AI Assessment: ${rawProfile.latest_summary}\n`;
      }
      if (rawProfile?.latest_risk_rec) {
        studentContext += `Risk Recommendation: ${rawProfile.latest_risk_rec}\n`;
      }
    }

    if (rules) {
      studentContext += `Trading Rules: Max ${rules.max_risk_per_trade}% risk/trade, Max ${rules.max_trades_per_day} trades/day, Max ${rules.max_daily_loss}% daily loss\n`;
      if (Array.isArray(rules.allowed_sessions) && rules.allowed_sessions.length) {
        studentContext += `Allowed Sessions: ${rules.allowed_sessions.join(", ")}\n`;
      }
      if (Array.isArray(rules.forbidden_behaviors) && rules.forbidden_behaviors.length) {
        studentContext += `Forbidden Behaviors: ${rules.forbidden_behaviors.join(", ")}\n`;
      }
    }

    if (trades.length > 0) {
      const netPnl = trades.reduce((sum, t) => sum + computeTradePnl(t), 0);
      const wins = trades.filter((t) => computeTradePnl(t) > 0).length;
      const losses = trades.filter((t) => computeTradePnl(t) < 0).length;
      const ruleCompliant = trades.filter((t) => t.followed_rules).length;
      const avgRisk = trades.reduce((sum, t) => sum + Number(t.risk_used || 0), 0) / trades.length;
      const complianceRate = Math.round((ruleCompliant / trades.length) * 100);

      studentContext += `\nTrade Snapshot: ${trades.length} recent trades, ${wins} wins / ${losses} losses, Net P/L ${netPnl >= 0 ? "+" : ""}$${Math.abs(netPnl).toFixed(2)}, Rule Compliance ${complianceRate}%, Avg Risk $${avgRisk.toFixed(2)}\n`;
      studentContext += "Recent Trades:\n";

      for (const t of trades.slice(0, 10)) {
        const pnl = computeTradePnl(t);
        const outcome = t.outcome || (pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BREAKEVEN");
        const symbol = t.symbol || "N/A";
        const noteSnippet = t.notes ? String(t.notes).slice(0, 110) : "No note";
        studentContext += `  • ${t.trade_date} | ${symbol} | ${outcome} | P/L ${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toFixed(2)} | Followed Rules: ${t.followed_rules ? "Yes" : "No"} | ${noteSnippet}\n`;
      }
    } else {
      studentContext += "\nNo trades logged yet.\n";
    }

    const completedLessonIds = new Set(
      lessonProgress.filter((lp) => lp.completed).map((lp) => lp.lesson_id)
    );

    if (lessons.length > 0) {
      const completedLessonCount = completedLessonIds.size;
      const lessonPct = Math.round((completedLessonCount / lessons.length) * 100);
      studentContext += `\nLearning Progress: ${completedLessonCount}/${lessons.length} lessons completed (${lessonPct}%)\n`;

      const completedRecent = lessonProgress
        .filter((lp) => lp.completed && lp.completed_at)
        .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
        .slice(0, 5);

      if (completedRecent.length > 0) {
        studentContext += "Recently Completed Lessons:\n";
        for (const lp of completedRecent) {
          const lesson = lessons.find((l) => l.id === lp.lesson_id);
          if (lesson) {
            studentContext += `  • "${lesson.lesson_title}" in ${lesson.module_title}\n`;
          }
        }
      }
    }

    if (playbookChapters.length > 0) {
      const completedChapterIds = new Set(
        playbookProgress
          .filter((p) => p.checkpoint_passed || p.status === "completed")
          .map((p) => p.chapter_id)
      );
      const playbookCompletedCount = playbookChapters.filter((c) => completedChapterIds.has(c.id)).length;
      const nextChapter = playbookChapters.find((c) => !completedChapterIds.has(c.id));
      studentContext += `\nPlaybook Progress: ${playbookCompletedCount}/${playbookChapters.length} chapters complete\n`;
      if (nextChapter) {
        studentContext += `Next Playbook Chapter: ${nextChapter.title}\n`;
      }
    }

    if (journals.length > 0) {
      studentContext += "\nRecent Journal Insights:\n";
      for (const j of journals.slice(0, 5)) {
        studentContext += `  • ${j.entry_date} | ${j.ticker || "N/A"} | Followed rules: ${j.followed_rules ? "Yes" : "No"} | Mistake: ${String(j.biggest_mistake || "—").slice(0, 80)} | Lesson: ${String(j.lesson || "—").slice(0, 80)}\n`;
      }
    }

    // ── Assemble full system prompt ──
    const fullSystemPrompt = `${SYSTEM_PROMPT}

[CURRICULUM — Academy Lessons Available]
${curriculumBlock}

[STUDENT CONTEXT — Use selectively, only when the user asks about their performance/progress]
${studentContext || "No student data available."}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages,
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
