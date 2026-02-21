import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, MessageSquare, Video, FileText } from "lucide-react";

const FEED_ITEMS = [
  { icon: BookOpen, label: "New lesson available", desc: "Module 2: Risk Management", action: "/academy/learn", cta: "Watch" },
  { icon: TrendingUp, label: "Coach reviewed your trade", desc: "TSLA scalp — feedback ready", action: "/academy/trade", cta: "View" },
  { icon: MessageSquare, label: "Announcement", desc: "Weekly office hours moved to Thursday", action: "/academy/community", cta: "Read" },
  { icon: Video, label: "Live session tomorrow", desc: "Market prep — 9:00 AM ET", action: "/academy/live", cta: "Details" },
];

export function CoachFeedCard() {
  const navigate = useNavigate();

  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-lg font-bold text-[rgba(255,255,255,0.94)]">Coach Feed</h3>

      <div className="space-y-2.5">
        {FEED_ITEMS.map((item, i) => {
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
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[rgba(255,255,255,0.88)] truncate">{item.label}</p>
                <p className="text-xs text-[rgba(255,255,255,0.45)] truncate">{item.desc}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg text-xs font-semibold h-8 px-3 text-primary hover:text-primary shrink-0"
                onClick={() => navigate(item.action)}
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
