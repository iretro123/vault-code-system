import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronDown, TrendingUp, MessageSquare, Sparkles, BookOpen, Video, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  firstName: string;
  onCheckIn: () => void;
}

const CREATE_ITEMS = [
  { icon: TrendingUp, label: "Log Trade", route: "/academy/trade" },
  { icon: MessageSquare, label: "Chat", route: "/academy/community" },
  { icon: Sparkles, label: "Ask Coach", action: "coach" },
  { icon: BookOpen, label: "Lessons", route: "/academy/learn" },
  { icon: Video, label: "Live", route: "/academy/live" },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function useStatusLine(userId: string | undefined) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    resolveStatus(userId).then((msg) => {
      if (!cancelled) setMessage(msg);
    });

    return () => { cancelled = true; };
  }, [userId]);

  return message;
}

async function resolveStatus(userId: string): Promise<string> {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const mondayDate = monday.toISOString().slice(0, 10);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [journalRes, liveRes, streakRes] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("entry_date", mondayDate),
    supabase
      .from("live_sessions")
      .select("id, title, session_date")
      .gte("session_date", now.toISOString())
      .lte("session_date", endOfTomorrow.toISOString())
      .order("session_date", { ascending: true })
      .limit(1),
    supabase
      .from("vault_daily_checklist")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7),
  ]);

  if (liveRes.data && liveRes.data.length > 0) {
    const sessionDate = new Date(liveRes.data[0].session_date);
    const isToday = sessionDate <= endOfToday;
    const label = isToday ? "Live session tonight" : "Live session tomorrow";
    return `${label}: "${liveRes.data[0].title}"`;
  }
  if ((journalRes.count ?? 0) === 0) {
    return "No journal entries this week. Log a trade to stay accountable.";
  }
  const dayOfWeek = now.getDay();
  if (dayOfWeek >= 5 || dayOfWeek === 0) {
    return "Weekly review is due. Reflect before the week resets.";
  }
  if (streakRes.data && streakRes.data.length >= 3) {
    return `${streakRes.data.length}-day check-in streak active. Keep it going.`;
  }
  return "Your trading discipline journey continues";
}

const PARTICLE_COUNT = 18;
const CONNECT_DIST = 60;

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let opacity = 0;
    let paused = document.hidden;
    const startTime = performance.now();

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const w = () => (canvas.parentElement?.getBoundingClientRect().width ?? 300);
    const h = () => (canvas.parentElement?.getBoundingClientRect().height ?? 150);

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.8,
    }));

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused && !prefersReduced) {
        animId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const draw = (now: number) => {
      if (paused) return;
      const cw = w(), ch = h();
      ctx.clearRect(0, 0, cw, ch);

      // Entrance fade
      opacity = Math.min(1, (now - startTime) / 600);

      if (!prefersReduced) {
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > cw) p.vx *= -1;
          if (p.y < 0 || p.y > ch) p.vy *= -1;
        });
      }

      // Lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const lineAlpha = (1 - dist / CONNECT_DIST) * 0.15 * opacity;
            ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Dots
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.25 * opacity})`;
        ctx.fill();
      });

      if (!prefersReduced) {
        animId = requestAnimationFrame(draw);
      }
    };

    animId = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}

export function HeroHeader({ firstName, onCheckIn }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { hasAccess, status, isAdminBypass } = useStudentAccess();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const statusLine = useStatusLine(user?.id);

  const showUpgrade = !hasAccess && !isAdminBypass;
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      const url = data?.url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (err: any) {
      console.error("[AccessGate] Checkout error:", err);
      toast.error("Unable to start checkout. Please try again.");
      setCheckoutLoading(false);
    }
  };

  const handleItem = (item: (typeof CREATE_ITEMS)[number]) => {
    if (item.action === "coach") {
      window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
    } else if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <div className="vault-luxury-card p-5 md:p-7 relative overflow-hidden border-t border-white/[0.08]">
      {/* Animated particle network background — disabled on mobile to prevent crashes */}
      {!isMobile && <ParticleCanvas />}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-10">
        <div className="space-y-2">
          {/* Online indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: "0 0 8px 2px rgba(16,185,129,0.3)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/90">
              Online
            </span>
          </div>

          {/* Greeting */}
          <h1 className="text-[26px] md:text-[32px] font-bold tracking-tight leading-tight text-muted-foreground" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
            {getGreeting()},{" "}
            <span className="text-primary" style={{ textShadow: "0 0 20px rgba(59,130,246,0.25)" }}>{firstName}</span>
          </h1>

          {/* Dynamic status line */}
          {statusLine === null ? (
            <div className="h-4 w-48 bg-muted/40 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-lg animate-fade-in">
              {statusLine}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showUpgrade && (
            <Button onClick={handleCheckout} disabled={checkoutLoading} className="gap-2 h-11 px-5" variant={isPastDue || isCanceled ? "outline" : "default"}>
              {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isPastDue ? "Update Billing" : isCanceled ? "Rejoin" : "Join Vault Academy"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={showUpgrade ? "outline" : "default"} className="gap-2 h-11 px-5">
                <Plus className="h-4 w-4" />
                Quick
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-popover border border-border z-50"
            >
              <svg className="h-0 w-0 absolute">
                <defs>
                  <linearGradient id="hero-coach-sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="50%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#F472B6" />
                  </linearGradient>
                </defs>
              </svg>
              {CREATE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isCoach = item.action === "coach";
                return (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={() => handleItem(item)}
                    className="gap-2.5 py-2.5 cursor-pointer"
                  >
                    <Icon
                      className={isCoach ? "h-4 w-4 drop-shadow-[0_0_3px_rgba(244,114,182,0.4)]" : "h-4 w-4 text-primary/70"}
                      style={isCoach ? { stroke: "url(#hero-coach-sparkle-grad)" } : undefined}
                    />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
