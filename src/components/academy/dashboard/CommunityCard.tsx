import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageSquare, Users, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";

/* Animated candlestick canvas background */
function CandlestickCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    // Generate candle data
    const candleCount = 14;
    type Candle = { open: number; close: number; high: number; low: number; x: number };
    let candles: Candle[] = [];
    let tick = 0;

    const generateCandles = (w: number, h: number) => {
      const spacing = w / (candleCount + 1);
      let price = h * 0.6;
      candles = [];
      for (let i = 0; i < candleCount; i++) {
        const change = (Math.random() - 0.45) * h * 0.12;
        const open = price;
        const close = price + change;
        const high = Math.min(open, close) - Math.random() * h * 0.06;
        const low = Math.max(open, close) + Math.random() * h * 0.06;
        candles.push({ open, close, high, low, x: spacing * (i + 1) });
        price = close;
      }
    };

    const rect = canvas.getBoundingClientRect();
    generateCandles(rect.width, rect.height);

    const draw = () => {
      const r = canvas.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = 0; x < w; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Candles
      const candleW = Math.max(6, w / (candleCount * 2.5));
      candles.forEach((c, i) => {
        const isGreen = c.close < c.open;
        const green = "rgba(34,197,94,0.6)";
        const red = "rgba(239,68,68,0.5)";
        const color = isGreen ? green : red;

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x, c.high);
        ctx.lineTo(c.x, c.low);
        ctx.stroke();

        // Body
        const top = Math.min(c.open, c.close);
        const bodyH = Math.max(3, Math.abs(c.close - c.open));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(c.x - candleW / 2, top, candleW, bodyH, 1.5);
        ctx.fill();

        // Glow on green candles
        if (isGreen) {
          ctx.shadowColor = "rgba(34,197,94,0.15)";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }
      });

      // Animate last candle
      tick++;
      if (tick % 60 === 0 && candles.length > 0) {
        const last = candles[candles.length - 1];
        const shift = (Math.random() - 0.5) * 4;
        last.close = Math.max(10, Math.min(h - 10, last.close + shift));
        last.high = Math.min(last.high, Math.min(last.open, last.close) - 2);
        last.low = Math.max(last.low, Math.max(last.open, last.close) + 2);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    const ro = new ResizeObserver(() => {
      resize();
      generateCandles(canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

export function CommunityCard() {
  const navigate = useNavigate();

  return (
    <div
      className="vault-luxury-card relative overflow-hidden p-6 flex flex-col cursor-pointer group"
      onClick={() => navigate("/academy/community")}
    >
      {/* Animated candlestick background */}
      <CandlestickCanvas />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 pointer-events-none" />

      {/* Blue accent glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.12),transparent_60%)]" />

      <div className="relative z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold uppercase tracking-[0.1em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Trade Floor
            </span>
            <span className="text-[10px] text-white/50 font-medium">
              Community Hub
            </span>
          </div>

          {/* Live pill */}
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Live
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-[13px] text-white/80 mb-4 leading-relaxed font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          Connect with traders, share setups, and post your wins.
        </p>

        {/* Stats strip */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08]">
            <Users className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-semibold text-white/70">Chat</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08]">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] font-semibold text-white/70">Signals</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08]">
            <span className="text-[11px]">🏆</span>
            <span className="text-[11px] font-semibold text-white/70">Wins</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/academy/community");
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-[0.97] group-hover:shadow-[0_0_24px_hsl(var(--primary)/0.35)]"
        >
          Enter Trade Floor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
