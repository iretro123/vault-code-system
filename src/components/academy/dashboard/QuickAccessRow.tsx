import { useNavigate } from "react-router-dom";
import { TrendingUp, MessageSquare, Sparkles, Wrench, Video } from "lucide-react";

const ITEMS = [
  { icon: TrendingUp, label: "Trade", route: "/academy/trade" },
  { icon: MessageSquare, label: "Chat", route: "/academy/community" },
  { icon: Sparkles, label: "Ask Coach", action: "coach" },
  { icon: Wrench, label: "Toolkit", route: "/academy/resources" },
  { icon: Video, label: "Live / Replays", route: "/academy/live" },
];

export function QuickAccessRow() {
  const navigate = useNavigate();

  const handleClick = (item: (typeof ITEMS)[number]) => {
    if (item.action === "coach") {
      window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
    } else if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <div className="vault-luxury-card p-6">
      <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-muted-foreground/60 mb-4">
        Quick Access
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleClick(item)}
              className="flex flex-col items-center gap-2.5 rounded-2xl py-6 px-4 transition-all duration-150 group"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "0 0 16px rgba(59,130,246,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Icon className="h-5.5 w-5.5 text-primary transition-all duration-150 group-hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
              <span className="text-xs font-semibold text-foreground/80">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
