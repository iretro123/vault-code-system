import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, PenLine, ClipboardCheck, Video,
  MessageSquare, Wrench, Loader2, Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { detectStuck } from "@/lib/detectStuck";

interface AlertItem {
  icon: typeof AlertTriangle;
  text: string;
  action: string;
  cta: string;
  priority: number;
  iconBg: string;
}

export function VaultIntelligenceCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    buildAlerts(user.id).then((alerts) => {
      if (!cancelled) {
        setItems(alerts);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="vault-glass-card p-6 flex items-center justify-center h-[160px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="vault-glass-card p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">Vault Intelligence</h3>
        </div>
        <p className="text-sm text-[rgba(255,255,255,0.50)]">
          No action required. Stay disciplined.
        </p>
      </div>
    );
  }

  return (
    <div className="vault-glass-card p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">Vault Intelligence</h3>
      </div>

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
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: item.iconBg }}
              >
                <Icon className="h-4 w-4 text-white/80" />
              </div>
              <p className="flex-1 min-w-0 text-sm text-[rgba(255,255,255,0.85)] leading-snug truncate">
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
          );
        })}
      </div>
    </div>
  );
}

async function buildAlerts(userId: string): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const twoDaysAgoDate = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const mondayDate = monday.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [stuckSignals, checkinTodayRes, liveRes, coachRepliesRes, toolkitRes] = await Promise.all([
    detectStuck(userId),
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
      .select("id")
      .eq("is_admin", true)
      .gte("created_at", twoDaysAgoDate)
      .limit(1),
    supabase
      .from("inbox_items")
      .select("id")
      .eq("type", "toolkit_activity")
      .gte("created_at", twoDaysAgoDate)
      .limit(1),
  ]);

  if (stuckSignals.recentLosses) {
    alerts.push({
      icon: AlertTriangle,
      text: "Repeated losses detected. Pause and review your process.",
      action: "/academy/journal",
      cta: "Review",
      priority: 1,
      iconBg: "rgba(239,68,68,0.18)",
    });
  }

  if (stuckSignals.inactive) {
    alerts.push({
      icon: PenLine,
      text: "You traded but didn't journal. Log it now.",
      action: "/academy/journal",
      cta: "Journal",
      priority: 2,
      iconBg: "rgba(245,158,11,0.18)",
    });
  }

  if ((checkinTodayRes.count ?? 0) === 0) {
    alerts.push({
      icon: ClipboardCheck,
      text: "Daily check-in pending. 30 seconds.",
      action: "/academy/home#checkin",
      cta: "Check in",
      priority: 3,
      iconBg: "rgba(59,130,246,0.14)",
    });
  }

  if (liveRes.data && liveRes.data.length > 0) {
    alerts.push({
      icon: Video,
      text: `Live session within 24 hours.`,
      action: "/academy/live",
      cta: "Details",
      priority: 4,
      iconBg: "rgba(34,197,94,0.14)",
    });
  }

  if (coachRepliesRes.data && coachRepliesRes.data.length > 0) {
    alerts.push({
      icon: MessageSquare,
      text: "Your mentor responded. Review their feedback.",
      action: "coach",
      cta: "Open",
      priority: 5,
      iconBg: "rgba(59,130,246,0.14)",
    });
  }

  if (toolkitRes.data && toolkitRes.data.length > 0) {
    alerts.push({
      icon: Wrench,
      text: "New resource added to the Toolkit.",
      action: "/academy/resources",
      cta: "Open",
      priority: 6,
      iconBg: "rgba(168,85,247,0.14)",
    });
  }

  alerts.sort((a, b) => a.priority - b.priority);
  return alerts.slice(0, 4);
}
