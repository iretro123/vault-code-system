import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageSquare, Users, TrendingUp } from "lucide-react";
import { useEffect, useRef } from "react";

/* Animated scrolling candlestick canvas background */
function CandlestickCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    type Candle = { open: number; close: number; high: number; low: number };
    const candles: Candle[] = [];
    const spacing = 28;
    const maxCandles = 25;
    let scrollX = 0;
    let targetClose = h * 0.5;
    let lastPrice = h * 0.5;
    let frameCount = 0;

    const addCandle = () => {
      const change = (Math.random() - 0.45) * h * 0.1;
      const open = lastPrice;
      const close = open + change;
      const high = Math.min(open, close) - Math.random() * h * 0.05 - 2;
      const low = Math.max(open, close) + Math.random() * h * 0.05 + 2;
      candles.push({ open, close, high, low });
      lastPrice = close;
      if (candles.length > maxCandles) candles.shift();
    };

    // Seed initial candles shifted right
    for (let i = 0; i < 18; i++) addCandle();

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Scroll offset — candles anchored to the right
      scrollX += 0.35;
      frameCount++;

      // Spawn new candle every ~80 frames
      if (frameCount % 80 === 0) {
        addCandle();
        targetClose = lastPrice + (Math.random() - 0.5) * h * 0.08;
        targetClose = Math.max(h * 0.2, Math.min(h * 0.8, targetClose));
      }

      // Animate last candle smoothly
      if (candles.length > 0) {
        const last = candles[candles.length - 1];
        last.close = lerp(last.close, targetClose, 0.02);
        last.high = Math.min(last.high, Math.min(last.open, last.close) - 2);
        last.low = Math.max(last.low, Math.max(last.open, last.close) + 2);
      }

      const candleW = Math.max(7, spacing * 0.45);
      const totalWidth = candles.length * spacing;
      // Anchor right edge of chart to right side of canvas
      const baseX = w - totalWidth + scrollX % spacing;

      candles.forEach((c, i) => {
        const cx = baseX + i * spacing;
        if (cx < -spacing || cx > w + spacing) return;

        const isGreen = c.close < c.open;
        const green = "rgba(34,197,94,0.7)";
        const red = "rgba(239,68,68,0.6)";
        const color = isGreen ? green : red;

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, c.high);
        ctx.lineTo(cx, c.low);
        ctx.stroke();

        // Body
        const top = Math.min(c.open, c.close);
        const bodyH = Math.max(3, Math.abs(c.close - c.open));
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(cx - candleW / 2, top, candleW, bodyH, 2);
        ctx.fill();

        // Glow on green
        if (isGreen) {
          ctx.shadowColor = "rgba(34,197,94,0.2)";
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }
      });

      // Glowing price line from last candle to right edge
      if (candles.length > 0) {
        const last = candles[candles.length - 1];
        const lastX = baseX + (candles.length - 1) * spacing;
        const priceY = last.close;

        ctx.save();
        ctx.strokeStyle = "rgba(34,197,94,0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(lastX, priceY);
        ctx.lineTo(w, priceY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glow dot
        ctx.beginPath();
        ctx.arc(lastX, priceY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,197,94,0.8)";
        ctx.shadowColor = "rgba(34,197,94,0.6)";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    const ro = new ResizeObserver(() => resize());
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
