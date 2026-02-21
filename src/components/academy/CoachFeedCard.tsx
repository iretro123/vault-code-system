import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, PenLine, ClipboardCheck, Video,
  MessageSquare, Wrench, Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { detectStuck, type StuckSignals } from "@/lib/detectStuck";

interface FeedItem {
  icon: typeof AlertTriangle;
  label: string;
  desc: string;
  action: string;
  cta: string;
  priority: number;
  iconBg: string;
}

export function CoachFeedCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    buildFeed(user.id).then((feed) => {
      if (!cancelled) {
        setItems(feed);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="vault-glass-card p-6 flex items-center justify-center h-[200px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="vault-glass-card p-6 space-y-3">
        <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">Coach Feed</h3>
        <p className="text-sm text-[rgba(255,255,255,0.50)]">
          Nothing urgent. Stay disciplined.
        </p>
      </div>
    );
  }

  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">Coach Feed</h3>

      <div className="space-y-2.5">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: item.iconBg }}
              >
                <Icon className="h-4 w-4 text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[rgba(255,255,255,0.88)] truncate">{item.label}</p>
                <p className="text-xs text-[rgba(255,255,255,0.45)] truncate">{item.desc}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg text-xs font-semibold h-8 px-3 text-primary hover:text-primary shrink-0"
                onClick={() => {
                  if (item.action === "coach") {
                    window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
                  } else {
                    navigate(item.action);
                  }
                }}
              >
                {item.cta}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function buildFeed(userId: string): Promise<FeedItem[]> {
  const feed: FeedItem[] = [];
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);

  // Run all queries in parallel
  const twoDaysAgoDate = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const mondayDate = monday.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [stuckSignals, journalThisWeekRes, checkinTodayRes, liveRes, coachRepliesRes] = await Promise.all([
    detectStuck(userId),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("entry_date", mondayDate),
    supabase
      .from("vault_daily_checklist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("date", todayDate),
    supabase
      .from("live_sessions")
      .select("id, title, session_date")
      .gte("session_date", now.toISOString())
      .lte("session_date", tomorrow.toISOString())
      .order("session_date", { ascending: true })
      .limit(1),
    supabase
      .from("coach_ticket_replies")
      .select("id, body, created_at, ticket_id")
      .eq("is_admin", true)
      .gte("created_at", twoDaysAgoDate)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  // Priority 1: Stuck alerts
  if (stuckSignals.recentLosses) {
    feed.push({
      icon: AlertTriangle,
      label: "Pattern detected: repeated losses",
      desc: "Two or more rule breaks in 48 hours. Pause and review your process.",
      action: "/academy/journal",
      cta: "Review",
      priority: 1,
      iconBg: "rgba(239,68,68,0.18)",
    });
  }

  if (stuckSignals.inactive) {
    feed.push({
      icon: AlertTriangle,
      label: "Trades without journal entries",
      desc: "You traded recently but didn't journal. Logging builds awareness.",
      action: "/academy/journal",
      cta: "Journal",
      priority: 2,
      iconBg: "rgba(245,158,11,0.18)",
    });
  }

  // Priority 2: Missing journal this week
  if ((journalThisWeekRes.count ?? 0) === 0) {
    feed.push({
      icon: PenLine,
      label: "No journal entries this week",
      desc: "Log at least one trade to stay accountable.",
      action: "/academy/journal",
      cta: "Log trade",
      priority: 3,
      iconBg: "rgba(168,85,247,0.14)",
    });
  }

  // Priority 3: Missing daily check-in
  if ((checkinTodayRes.count ?? 0) === 0) {
    feed.push({
      icon: ClipboardCheck,
      label: "Daily check-in pending",
      desc: "30 seconds to confirm you followed your rules today.",
      action: "/academy/home#checkin",
      cta: "Check in",
      priority: 4,
      iconBg: "rgba(59,130,246,0.14)",
    });
  }

  // Priority 4: Upcoming live session
  if (liveRes.data && liveRes.data.length > 0) {
    const session = liveRes.data[0];
    feed.push({
      icon: Video,
      label: "Live session within 24 hours",
      desc: `"${session.title}" — don't miss it.`,
      action: "/academy/live",
      cta: "Details",
      priority: 5,
      iconBg: "rgba(34,197,94,0.14)",
    });
  }

  // Priority 5: Coach replies
  if (coachRepliesRes.data && coachRepliesRes.data.length > 0) {
    feed.push({
      icon: MessageSquare,
      label: "New coach reply",
      desc: "Your mentor responded. Review their feedback.",
      action: "coach",
      cta: "Open",
      priority: 6,
      iconBg: "rgba(59,130,246,0.14)",
    });
  }

  // Sort by priority and cap at 5
  feed.sort((a, b) => a.priority - b.priority);
  return feed.slice(0, 5);
}
