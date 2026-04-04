import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageSquare, Users } from "lucide-react";

/* Inline SVG candlestick pattern — lightweight, no external assets */
function CandlestickBg() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none"
      viewBox="0 0 320 160"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {/* Candle 1 - green */}
      <rect x="30" y="50" width="8" height="50" rx="1.5" fill="hsl(142 72% 45%)" />
      <line x1="34" y1="30" x2="34" y2="50" stroke="hsl(142 72% 45%)" strokeWidth="2" />
      <line x1="34" y1="100" x2="34" y2="120" stroke="hsl(142 72% 45%)" strokeWidth="2" />

      {/* Candle 2 - red */}
      <rect x="60" y="60" width="8" height="40" rx="1.5" fill="hsl(0 72% 50%)" />
      <line x1="64" y1="40" x2="64" y2="60" stroke="hsl(0 72% 50%)" strokeWidth="2" />
      <line x1="64" y1="100" x2="64" y2="115" stroke="hsl(0 72% 50%)" strokeWidth="2" />

      {/* Candle 3 - green */}
      <rect x="90" y="35" width="8" height="55" rx="1.5" fill="hsl(142 72% 45%)" />
      <line x1="94" y1="15" x2="94" y2="35" stroke="hsl(142 72% 45%)" strokeWidth="2" />
      <line x1="94" y1="90" x2="94" y2="110" stroke="hsl(142 72% 45%)" strokeWidth="2" />

      {/* Candle 4 - green */}
      <rect x="120" y="25" width="8" height="45" rx="1.5" fill="hsl(142 72% 45%)" />
      <line x1="124" y1="10" x2="124" y2="25" stroke="hsl(142 72% 45%)" strokeWidth="2" />
      <line x1="124" y1="70" x2="124" y2="95" stroke="hsl(142 72% 45%)" strokeWidth="2" />

      {/* Candle 5 - red */}
      <rect x="150" y="45" width="8" height="50" rx="1.5" fill="hsl(0 72% 50%)" />
      <line x1="154" y1="25" x2="154" y2="45" stroke="hsl(0 72% 50%)" strokeWidth="2" />
      <line x1="154" y1="95" x2="154" y2="125" stroke="hsl(0 72% 50%)" strokeWidth="2" />

      {/* Candle 6 - green */}
      <rect x="180" y="30" width="8" height="60" rx="1.5" fill="hsl(142 72% 45%)" />
      <line x1="184" y1="10" x2="184" y2="30" stroke="hsl(142 72% 45%)" strokeWidth="2" />
      <line x1="184" y1="90" x2="184" y2="110" stroke="hsl(142 72% 45%)" strokeWidth="2" />

      {/* Candle 7 - red */}
      <rect x="210" y="55" width="8" height="35" rx="1.5" fill="hsl(0 72% 50%)" />
      <line x1="214" y1="35" x2="214" y2="55" stroke="hsl(0 72% 50%)" strokeWidth="2" />
      <line x1="214" y1="90" x2="214" y2="115" stroke="hsl(0 72% 50%)" strokeWidth="2" />

      {/* Candle 8 - green */}
      <rect x="240" y="20" width="8" height="55" rx="1.5" fill="hsl(142 72% 45%)" />
      <line x1="244" y1="5" x2="244" y2="20" stroke="hsl(142 72% 45%)" strokeWidth="2" />
      <line x1="244" y1="75" x2="244" y2="100" stroke="hsl(142 72% 45%)" strokeWidth="2" />

      {/* Candle 9 - green */}
      <rect x="270" y="15" width="8" height="50" rx="1.5" fill="hsl(142 72% 45%)" />
      <line x1="274" y1="0" x2="274" y2="15" stroke="hsl(142 72% 45%)" strokeWidth="2" />
      <line x1="274" y1="65" x2="274" y2="90" stroke="hsl(142 72% 45%)" strokeWidth="2" />
    </svg>
  );
}

export function CommunityCard() {
  const navigate = useNavigate();

  return (
    <div
      className="vault-luxury-card relative overflow-hidden p-6 flex flex-col cursor-pointer group"
      onClick={() => navigate("/academy/community")}
    >
      {/* Candlestick background art */}
      <CandlestickBg />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.08),transparent_70%)]" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 border border-primary/20">
            <MessageSquare className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary/80">
              Trade Floor
            </span>
            <span className="text-[10px] text-muted-foreground/60 font-medium">
              Community Hub
            </span>
          </div>

          {/* Live indicator */}
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Active
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground/70 mb-4 leading-relaxed">
          Connect with traders, share setups, and post your wins.
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-xs font-semibold text-white/50">Live Chat</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-xs font-semibold text-white/50">Signals • Wins • Setups</span>
        </div>

        {/* CTA */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/academy/community");
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-[0.97] group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
        >
          Enter Trade Floor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
