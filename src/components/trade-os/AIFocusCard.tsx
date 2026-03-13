import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain, Lock, RefreshCw, AlertTriangle, Crosshair, Target, Activity,
  Plus, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/* ── Types & Constants ── */
const AI_FOCUS_CACHE = "va_cache_ai_focus_v3";
const AI_FOCUS_CACHE_TS = "va_cache_ai_focus_ts";

interface AIFocusResult {
  primaryLeak: string;
  primaryLeakConfidence: "high" | "medium" | "insufficient";
  strongestEdge: string;
  nextAction: string;
  progressVerdict: string;
  riskGrade: "A" | "B" | "C" | "D" | "F";
  dataDepth: number;
  dataConfidence: "high" | "medium" | "low";
  date: string;
  tradeCount: number;
}

const MENTOR_STYLES = `
@keyframes mentorScan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
@keyframes mentorBorder { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes mentorPulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.15); } }
@keyframes mentorShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes mentorFadeIn { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
`;

const RISK_GRADE_MAP: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  A: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", glow: "shadow-[0_0_12px_-3px_rgba(52,211,153,0.3)]" },
  B: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25", glow: "shadow-[0_0_12px_-3px_rgba(96,165,250,0.3)]" },
  C: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", glow: "shadow-[0_0_12px_-3px_rgba(251,191,36,0.3)]" },
  D: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", glow: "shadow-[0_0_12px_-3px_rgba(251,146,60,0.3)]" },
  F: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", glow: "shadow-[0_0_12px_-3px_rgba(248,113,113,0.3)]" },
};

const CONFIDENCE_MAP: Record<string, { label: string; color: string }> = {
  high: { label: "HIGH CONFIDENCE", color: "text-emerald-400/70" },
  medium: { label: "EMERGING PATTERN", color: "text-amber-400/70" },
  insufficient: { label: "NEEDS MORE DATA", color: "text-muted-foreground/50" },
};

/* ── Main Component ── */
export function AIFocusCard({ entries }: { entries: { id: string }[] }) {
  const [result, setResult] = useState<AIFocusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const tradeCount = entries.length;
  const isLocked = tradeCount < 3;
  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchAnalysis = useCallback(async (force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(AI_FOCUS_CACHE);
        if (cached) {
          const parsed: AIFocusResult = JSON.parse(cached);
          if (parsed.date === todayStr && parsed.tradeCount === tradeCount && parsed.primaryLeak && parsed.riskGrade) {
            setResult(parsed);
            return;
          }
        }
      } catch {}
    }
    setLoading(true); setError(null);
    if (force) setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trade-focus`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      });
      if (!resp.ok) { const body = await resp.json().catch(() => ({})); throw new Error(body.error || "Analysis failed"); }
      const data = await resp.json();
      const cached: AIFocusResult = { ...data, date: todayStr, tradeCount };
      setResult(cached);
      try {
        localStorage.setItem(AI_FOCUS_CACHE, JSON.stringify(cached));
        localStorage.setItem(AI_FOCUS_CACHE_TS, String(Date.now()));
      } catch {}
    } catch (e: any) { setError(e.message || "Something went wrong"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [todayStr, tradeCount]);

  useEffect(() => {
    if (!isLocked) fetchAnalysis();
  }, [isLocked, fetchAnalysis, tradeCount]);

  useEffect(() => {
    if (isLocked || !result) return;
    const now = new Date();
    if (now.getHours() < 18) return;
    try {
      const cachedTs = localStorage.getItem(AI_FOCUS_CACHE_TS);
      if (!cachedTs) return;
      const cachedDate = new Date(Number(cachedTs));
      if (cachedDate.toDateString() === now.toDateString() && cachedDate.getHours() < 18) {
        fetchAnalysis(true);
      }
    } catch {}
  }, [isLocked, result, fetchAnalysis]);

  /* ── Locked State ── */
  if (isLocked) {
    return (
      <div id="ai-focus-card" className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card p-6 space-y-4">
        <style>{MENTOR_STYLES}</style>
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)", backgroundSize: "100% 4px", animation: "mentorScan 3s linear infinite" }}
        />
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-muted/40 border border-white/[0.06]">
            <Brain className="h-4.5 w-4.5 text-muted-foreground/50" />
            <Lock className="h-2.5 w-2.5 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Performance Intelligence</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50">LOCKED</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Trades scanned</span>
            <span className="text-xs font-mono text-primary tabular-nums">{tradeCount}/3</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(tradeCount / 3) * 100}%`, background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))" }} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Log {3 - tradeCount} more trade{3 - tradeCount > 1 ? "s" : ""} to activate behavioral leak detection and pattern analysis.</p>
      </div>
    );
  }

  /* ── Loading State ── */
  if (loading && !refreshing) {
    return (
      <div id="ai-focus-card" className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card p-6 space-y-4">
        <style>{MENTOR_STYLES}</style>
        <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)", backgroundSize: "100% 4px", animation: "mentorScan 2s linear infinite" }}
        />
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/15">
            <Brain className="h-4.5 w-4.5 text-primary animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Performance Intelligence</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary/50 animate-pulse">COMPUTING ANALYTICS...</span>
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Error State ── */
  if (error) {
    return (
      <div id="ai-focus-card" className="rounded-2xl border border-destructive/20 bg-card p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20">
            <Brain className="h-4.5 w-4.5 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Performance Intelligence</h3>
            <span className="text-[10px] text-destructive/70">{error}</span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fetchAnalysis(true)}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  if (!result) return null;

  const gradeStyle = RISK_GRADE_MAP[result.riskGrade] || RISK_GRADE_MAP.C;
  const confStyle = CONFIDENCE_MAP[result.primaryLeakConfidence] || CONFIDENCE_MAP.medium;
  const isInsufficient = result.primaryLeakConfidence === "insufficient";

  if (isInsufficient) {
    return <InsufficientDataCard result={result} gradeStyle={gradeStyle} refreshing={refreshing} onRescan={() => fetchAnalysis(true)} />;
  }

  const slides = [
    {
      label: "PRIMARY LEAK", icon: AlertTriangle, value: result.primaryLeak,
      subLabel: confStyle.label, accent: "from-red-500/10 to-red-500/[0.02]",
      iconColor: "text-red-400", labelColor: "text-red-400/80", glowColor: "rgba(248,113,113,0.3)",
      dotColor: "bg-red-400", confidenceColor: confStyle.color,
    },
    {
      label: "STRONGEST EDGE", icon: Crosshair, value: result.strongestEdge,
      accent: "from-emerald-500/10 to-emerald-500/[0.02]", iconColor: "text-emerald-400",
      labelColor: "text-emerald-400/80", glowColor: "rgba(52,211,153,0.3)", dotColor: "bg-emerald-400",
    },
    {
      label: "NEXT ACTION", icon: Target, value: result.nextAction,
      accent: "from-blue-500/10 to-blue-500/[0.02]", iconColor: "text-blue-400",
      labelColor: "text-blue-400/80", glowColor: "rgba(59,130,246,0.3)", dotColor: "bg-blue-400",
    },
    {
      label: "PROGRESS", icon: Activity, value: result.progressVerdict,
      accent: "from-violet-500/10 to-violet-500/[0.02]", iconColor: "text-violet-400",
      labelColor: "text-violet-400/80", glowColor: "rgba(167,139,250,0.3)", dotColor: "bg-violet-400",
    },
  ];

  return <AIFocusCardCarousel result={result} slides={slides} gradeStyle={gradeStyle} refreshing={refreshing} />;
}

/* ── Insufficient Data Unlock Card ── */
function InsufficientDataCard({ result, gradeStyle, refreshing, onRescan }: {
  result: AIFocusResult;
  gradeStyle: { color: string; bg: string; border: string; glow: string };
  refreshing: boolean;
  onRescan: () => void;
}) {
  const tradeCount = result.tradeCount || result.dataDepth || 0;
  const target = 10;
  const percent = Math.min((tradeCount / target) * 100, 100);
  const remaining = Math.max(0, target - tradeCount);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const milestones = [
    { count: 3, label: "Basic scan", unlocked: tradeCount >= 3 },
    { count: 10, label: "Pattern detection", unlocked: tradeCount >= 10 },
    { count: 20, label: "Full behavioral audit", unlocked: tradeCount >= 20 },
  ];

  return (
    <div id="ai-focus-card" className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card">
      <style>{MENTOR_STYLES}</style>
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-20"
        style={{ background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary) / 0.15) 15%, transparent 30%, hsl(217 91% 60% / 0.1) 50%, transparent 65%, hsl(var(--primary) / 0.12) 80%, transparent 100%)", animation: "mentorBorder 10s linear infinite" }}
      />
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)", backgroundSize: "100% 4px", animation: "mentorScan 4s linear infinite" }}
      />

      <div className="relative p-5 pb-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20" style={{ animation: "mentorPulse 3s ease-in-out infinite" }} />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" }} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground tracking-tight"
              style={{ background: "linear-gradient(90deg, hsl(var(--foreground)), hsl(var(--primary) / 0.8), hsl(var(--foreground)))", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "mentorShimmer 6s linear infinite" }}
            >
              PERFORMANCE INTELLIGENCE
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 6px rgba(251,191,36,0.5)" }} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">BUILDING PROFILE</span>
            </div>
          </div>
          <div className={cn("px-3 py-1.5 rounded-lg border text-lg font-black tracking-tight opacity-30", gradeStyle.bg, gradeStyle.border, gradeStyle.color)}>
            {result.riskGrade}
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
              <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(var(--muted) / 0.2)" strokeWidth="5" />
              <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
                style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.4))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground tabular-nums">{tradeCount}</span>
              <span className="text-[10px] text-muted-foreground/60 font-mono">/{target}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <h4 className="text-base font-semibold text-foreground leading-snug">
              {remaining > 0 ? `Log ${remaining} more trade${remaining > 1 ? "s" : ""} to unlock full analysis` : "Pattern detection unlocked"}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">Your profile is being built. Each trade sharpens detection accuracy.</p>
          </div>
        </div>

        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.count} className={cn("flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border transition-all", m.unlocked ? "border-emerald-500/20 bg-emerald-500/[0.06]" : "border-white/[0.05] bg-white/[0.02]")}>
              <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", m.unlocked ? "bg-emerald-500/15" : "bg-muted/30")}>
                {m.unlocked ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Lock className="h-3 w-3 text-muted-foreground/40" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn("text-xs font-medium", m.unlocked ? "text-emerald-400/90" : "text-muted-foreground/60")}>{m.label}</span>
              </div>
              <span className={cn("text-[10px] font-mono tabular-nums", m.unlocked ? "text-emerald-400/60" : "text-muted-foreground/40")}>{m.count} trades</span>
            </div>
          ))}
        </div>

        <Button size="sm" variant="outline" className="w-full gap-1.5 rounded-xl border-primary/20 text-primary hover:bg-primary/5"
          onClick={() => document.getElementById("log-trade-section")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        >
          <Plus className="h-3.5 w-3.5" /> Log a Trade
        </Button>

        {refreshing && (
          <div className="flex items-center justify-center gap-1.5">
            <RefreshCw className="h-3 w-3 text-primary/50 animate-spin" />
            <span className="text-[10px] font-mono text-primary/50">Recomputing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Carousel sub-component ── */
function AIFocusCardCarousel({ result, slides, gradeStyle, refreshing }: {
  result: AIFocusResult;
  slides: { label: string; icon: any; value: string; subLabel?: string; accent: string; iconColor: string; labelColor: string; glowColor: string; dotColor: string; confidenceColor?: string }[];
  gradeStyle: { color: string; bg: string; border: string; glow: string };
  refreshing: boolean;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start", containScroll: "trimSnaps" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); emblaApi.off("reInit", onSelect); };
  }, [emblaApi]);

  return (
    <div id="ai-focus-card" className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card">
      <style>{MENTOR_STYLES}</style>
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-20"
        style={{ background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary) / 0.15) 15%, transparent 30%, hsl(217 91% 60% / 0.1) 50%, transparent 65%, hsl(var(--primary) / 0.12) 80%, transparent 100%)", animation: "mentorBorder 10s linear infinite" }}
      />
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)", backgroundSize: "100% 4px", animation: "mentorScan 3s linear infinite" }}
      />

      <div className="relative p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20" style={{ animation: "mentorPulse 3s ease-in-out infinite" }} />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" }} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground tracking-tight"
              style={{ background: "linear-gradient(90deg, hsl(var(--foreground)), hsl(var(--primary) / 0.8), hsl(var(--foreground)))", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "mentorShimmer 6s linear infinite" }}
            >
              PERFORMANCE INTELLIGENCE
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.5)", animation: "mentorPulse 2s ease-in-out infinite" }} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                Based on {result.dataDepth || result.tradeCount} trades
              </span>
            </div>
          </div>
          <div className={cn("px-3 py-1.5 rounded-lg border text-lg font-black tracking-tight", gradeStyle.bg, gradeStyle.border, gradeStyle.color, gradeStyle.glow)}>
            {result.riskGrade}
          </div>
        </div>

        <div className="overflow-hidden -mx-1" ref={emblaRef}>
          <div className="flex">
            {slides.map((s, i) => (
              <div key={s.label} className="flex-[0_0_100%] min-w-0 px-1">
                <div
                  className={cn("relative rounded-xl border border-white/[0.06] p-4 min-h-[140px] flex flex-col justify-center bg-gradient-to-br", s.accent)}
                  style={{ animation: `mentorFadeIn 0.4s ease-out ${i * 0.05}s both` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <s.icon className={cn("h-4 w-4", s.iconColor)} style={{ filter: `drop-shadow(0 0 6px ${s.glowColor})` }} />
                    </div>
                    <div className="flex flex-col">
                      <span className={cn("text-[10px] font-mono uppercase tracking-[0.14em] font-bold", s.labelColor)}>{s.label}</span>
                      {s.subLabel && (
                        <span className={cn("text-[9px] font-mono uppercase tracking-wider", s.confidenceColor || "text-muted-foreground/50")}>{s.subLabel}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-[14px] leading-[1.6] text-foreground/90 font-medium">{s.value}</p>
                  <div className="mt-3 h-[2px] rounded-full w-12 opacity-40" style={{ background: `linear-gradient(90deg, ${s.glowColor}, transparent)` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          <button onClick={() => emblaApi?.scrollPrev()}
            className={cn("w-7 h-7 flex items-center justify-center rounded-full transition-all duration-150", canScrollPrev ? "text-white/40 hover:text-white/70 hover:bg-white/[0.06]" : "opacity-0 pointer-events-none")}
            aria-label="Previous insight"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button key={i}
                className={cn("rounded-full transition-all duration-200", i === selectedIndex ? cn("w-5 h-2", s.dotColor, "opacity-90") : "w-2 h-2 bg-white/15 hover:bg-white/25")}
                style={i === selectedIndex ? { boxShadow: `0 0 8px ${s.glowColor}` } : undefined}
                onClick={() => emblaApi?.scrollTo(i)}
              />
            ))}
          </div>
          <button onClick={() => emblaApi?.scrollNext()}
            className={cn("w-7 h-7 flex items-center justify-center rounded-full transition-all duration-150", canScrollNext ? "text-white/40 hover:text-white/70 hover:bg-white/[0.06]" : "opacity-0 pointer-events-none")}
            aria-label="Next insight"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>

        {refreshing && (
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            <RefreshCw className="h-3 w-3 text-primary/50 animate-spin" />
            <span className="text-[10px] font-mono text-primary/50">Recomputing analytics...</span>
          </div>
        )}
      </div>
    </div>
  );
}
