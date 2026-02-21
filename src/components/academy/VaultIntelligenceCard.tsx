import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface FeedItem {
  text: string;
  cta: string;
  action: string;
}

export function VaultIntelligenceCard() {
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
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-primary/70" />
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
                } else {
                  navigate(item.action);
                }
              }}
            >
              {item.cta}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

async function buildCoachFeed(userId: string): Promise<FeedItem[]> {
  const feed: FeedItem[] = [];
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [repliesRes, ticketsRes] = await Promise.all([
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
  ]);

  if (repliesRes.data && repliesRes.data.length > 0) {
    feed.push({
      text: "Your mentor responded. Review their feedback.",
      cta: "Open",
      action: "coach",
    });
  }

  if (ticketsRes.data && ticketsRes.data.length > 0) {
    feed.push({
      text: "Your question has been answered.",
      cta: "View",
      action: "coach",
    });
  }

  return feed.slice(0, 2);
}
