import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface FeedItem {
  icon: typeof MessageSquare;
  text: string;
  cta: string;
  action: string;
}

interface Props {
  onCheckIn?: () => void;
}

export function VaultIntelligenceCard({ onCheckIn }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    buildCoachFeed(user.id).then((feed) => {
      if (!cancelled) {
        setItems(feed);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="vault-glass-card p-6 flex items-center justify-center h-[100px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="vault-glass-card p-6 space-y-3">
      <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.45)]">
        Coach Feed
      </h3>

      <div className="space-y-2">
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
              <Icon className="h-4 w-4 shrink-0 text-primary/70" />
              <p className="flex-1 min-w-0 text-sm text-[rgba(255,255,255,0.80)] truncate">
                {item.text}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg text-xs font-semibold h-8 px-3 text-primary hover:text-primary shrink-0"
                onClick={() => {
                  if (item.action === "coach") {
                    window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
                  } else if (item.action === "checkin" && onCheckIn) {
                    onCheckIn();
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

async function buildCoachFeed(userId: string): Promise<FeedItem[]> {
  const feed: FeedItem[] = [];
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const todayDate = new Date().toISOString().slice(0, 10);

  const [repliesRes, ticketsRes, checkinRes] = await Promise.all([
    supabase
      .from("coach_ticket_replies")
      .select("id")
      .eq("is_admin", true)
      .gte("created_at", twoDaysAgo)
      .limit(1),
    supabase
      .from("coach_tickets")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "answered")
      .gte("updated_at", twoDaysAgo)
      .limit(1),
    supabase
      .from("vault_daily_checklist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("date", todayDate),
  ]);

  // Check-in pending
  if ((checkinRes.count ?? 0) === 0) {
    feed.push({
      icon: ClipboardCheck,
      text: "Daily check-in pending. 30 seconds.",
      cta: "Check in",
      action: "checkin",
    });
  }

  if (repliesRes.data && repliesRes.data.length > 0) {
    feed.push({
      icon: MessageSquare,
      text: "Your mentor responded. Review their feedback.",
      cta: "Open",
      action: "coach",
    });
  }

  if (ticketsRes.data && ticketsRes.data.length > 0) {
    feed.push({
      icon: MessageSquare,
      text: "Your question has been answered.",
      cta: "View",
      action: "coach",
    });
  }

  return feed.slice(0, 2);
}
