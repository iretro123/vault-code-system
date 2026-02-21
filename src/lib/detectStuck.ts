import { supabase } from "@/integrations/supabase/client";

export interface StuckSignals {
  isStuck: boolean;
  recentLosses: boolean;
  brokenRules: boolean;
  inactive: boolean;
}

/**
 * Detects if a user is "stuck" based on behavioral signals.
 * Returns true if ANY of the following:
 * - 2+ journal entries with result=loss in last 48h
 * - daily check-in with followed_rules = false today
 * - no journal entries in last 2 days despite having trades
 */
export async function detectStuck(userId: string): Promise<StuckSignals> {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const twoDaysAgoDate = twoDaysAgo.toISOString().slice(0, 10);
  const todayDate = now.toISOString().slice(0, 10);

  const [lossesRes, rulesRes, journalRes, tradesRes] = await Promise.all([
    // 1) 2+ loss journals in 48h
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("biggest_mistake", "none")  // We check followed_rules=false as proxy for loss
      .gte("entry_date", twoDaysAgoDate),

    // Check journal entries where followed_rules = false in last 48h
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("followed_rules", false)
      .gte("entry_date", twoDaysAgoDate),

    // 3) Any journal entries in last 2 days
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("entry_date", twoDaysAgoDate),

    // 4) Any trades in last 2 days (to check if user is active)
    supabase
      .from("trade_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("trade_date", twoDaysAgoDate),
  ]);

  const recentLosses = (rulesRes.count ?? 0) >= 2;
  const brokenRules = (rulesRes.count ?? 0) > 0;
  const hasTradesButNoJournal = (tradesRes.count ?? 0) > 0 && (journalRes.count ?? 0) === 0;

  return {
    isStuck: recentLosses || brokenRules || hasTradesButNoJournal,
    recentLosses,
    brokenRules,
    inactive: hasTradesButNoJournal,
  };
}
