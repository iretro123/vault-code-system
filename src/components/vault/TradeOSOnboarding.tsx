import React, { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Zap, Target, BarChart3, Loader2, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveViableRiskMode } from "@/lib/vaultConstants";

type TradingStyle = "scalper" | "day_trader" | "swing_trader";
type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type Instrument = "options" | "futures" | "stocks";

interface TradeOSOnboardingProps {
  onComplete: () => Promise<void>;
}

const STEPS = 5;

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: STEPS }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i === current
              ? "w-8 bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
              : i < current
              ? "w-2 bg-primary/60"
              : "w-2 bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

export function TradeOSOnboarding({ onComplete }: TradeOSOnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<TradingStyle | null>(null);
  const [balance, setBalance] = useState("");
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const balanceNum = parseFloat(balance);
  const balanceValid = !isNaN(balanceNum) && balanceNum > 0;

  const toggleInstrument = (inst: Instrument) => {
    setInstruments((prev) =>
      prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]
    );
  };

  const handleActivate = useCallback(async () => {
    if (!user || !style || !balanceValid || instruments.length === 0 || !experience) return;
    setSubmitting(true);
    setError("");

    try {
      const resolved = resolveViableRiskMode(balanceNum, "CONSERVATIVE");
      const limits = resolved.limits;

      // Map style to legacy format for complete_onboarding RPC
      const legacyStyle = style === "scalper" ? "intraday" : style === "swing_trader" ? "multi_day" : "intraday";

      const { error: rpcError } = await supabase.rpc("complete_onboarding", {
        _user_id: user.id,
        _balance: balanceNum,
        _market_type: instruments[0] || "options",
        _default_style: legacyStyle,
      });

      if (rpcError) { setError(rpcError.message); setSubmitting(false); return; }

      // Persist vault limits
      const { error: limitError } = await supabase
        .from("vault_state")
        .update({
          risk_mode: resolved.applied_mode,
          account_balance: balanceNum,
          daily_loss_limit: limits.daily_loss_limit,
          risk_remaining_today: limits.daily_loss_limit,
          max_trades_per_day: limits.max_trades_per_day,
          trades_remaining_today: limits.max_trades_per_day,
          max_contracts_allowed: limits.max_contracts,
          vault_status: "GREEN",
          session_paused: true,
          open_trade: false,
          loss_streak: 0,
        })
        .eq("user_id", user.id);

      if (limitError) { setError("Failed to set vault limits."); setSubmitting(false); return; }

      // Seed trader_dna
      await (supabase.from("trader_dna" as any) as any).upsert({
        user_id: user.id,
        trading_style: style,
        instruments,
        experience_level: experience,
        strengths: [],
        weaknesses: [],
        personality_tags: [],
        insights_version: 0,
        raw_profile: { onboarded_at: new Date().toISOString(), initial_balance: balanceNum },
      });

      // Sync experience level to profile for chat badges & role display
      await supabase
        .from("profiles")
        .update({
          academy_experience: experience,
          role_level: experience,
        } as any)
        .eq("user_id", user.id);

      // Move to activation step
      setStep(4);
      await new Promise((r) => setTimeout(r, 2000));
      await onComplete();
    } catch {
      setError("Unexpected error. Try again.");
      setSubmitting(false);
    }
  }, [user, style, balanceNum, balanceValid, instruments, experience, onComplete]);

  const riskPreview = balanceValid
    ? `Vault will protect ~$${(balanceNum * 0.01).toFixed(0)}/day`
    : null;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <ProgressDots current={step} />

      <div className="w-full max-w-md">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.15)]">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Your Trading OS is Ready
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Vault OS learns how you trade and builds a system around your strengths. Let's set it up in 60 seconds.
              </p>
            </div>
            <Button
              onClick={() => setStep(1)}
              className="vault-cta w-full max-w-xs h-14 text-base font-semibold uppercase tracking-wide rounded-2xl"
              size="lg"
            >
              Let's Go <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 1: Trading Style */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">How Do You Trade?</h2>
              <p className="text-xs text-muted-foreground">This shapes your risk limits and AI coaching style</p>
            </div>

            <div className="space-y-2">
              {([
                { value: "scalper" as TradingStyle, label: "Scalper", desc: "Quick in-and-out. Seconds to minutes." },
                { value: "day_trader" as TradingStyle, label: "Day Trader", desc: "Intraday moves. Close everything by EOD." },
                { value: "swing_trader" as TradingStyle, label: "Swing Trader", desc: "Hold for days or weeks. Ride the trend." },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStyle(opt.value)}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-xl border transition-all duration-150",
                    style === opt.value
                      ? "bg-primary/10 border-primary/40 shadow-[0_0_16px_hsl(var(--primary)/0.1)]"
                      : "bg-card border-border hover:bg-card/80"
                  )}
                >
                  <span className={cn("text-sm font-semibold", style === opt.value ? "text-primary" : "text-foreground")}>
                    {opt.label}
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>

            <Button
              disabled={!style}
              onClick={() => setStep(2)}
              className="vault-cta w-full h-12 text-base font-semibold uppercase tracking-wide rounded-xl"
              size="lg"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Capital */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Your Capital</h2>
              <p className="text-xs text-muted-foreground">Enter your live trading account balance</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-mono">$</span>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="25,000"
                  className="font-mono text-2xl h-16 pl-9 rounded-xl bg-card border-border"
                  autoFocus
                />
              </div>
              {riskPreview && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary/5 border border-primary/10">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-primary font-medium">{riskPreview}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="h-12 rounded-xl">Back</Button>
              <Button
                disabled={!balanceValid}
                onClick={() => setStep(3)}
                className="vault-cta flex-1 h-12 text-base font-semibold uppercase tracking-wide rounded-xl"
                size="lg"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Edge — Instruments + Experience */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Your Edge</h2>
              <p className="text-xs text-muted-foreground">What do you trade? Pick all that apply.</p>
            </div>

            <div className="space-y-4">
              {/* Instruments */}
              <div className="flex gap-2">
                {(["options", "futures", "stocks"] as Instrument[]).map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => toggleInstrument(inst)}
                    className={cn(
                      "flex-1 py-3 rounded-xl border text-sm font-semibold capitalize transition-all duration-150",
                      instruments.includes(inst)
                        ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.1)]"
                        : "bg-card border-border text-muted-foreground hover:bg-card/80"
                    )}
                  >
                    {inst}
                  </button>
                ))}
              </div>

              {/* Experience */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Experience Level</p>
                <div className="space-y-2">
                  {([
                    { value: "beginner" as ExperienceLevel, label: "Beginner", desc: "Less than 1 year trading" },
                    { value: "intermediate" as ExperienceLevel, label: "Intermediate", desc: "1-3 years, some consistency" },
                    { value: "advanced" as ExperienceLevel, label: "Advanced", desc: "3+ years, profitable track record" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExperience(opt.value)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl border transition-all duration-150",
                        experience === opt.value
                          ? "bg-primary/10 border-primary/40"
                          : "bg-card border-border hover:bg-card/80"
                      )}
                    >
                      <span className={cn("text-sm font-semibold", experience === opt.value ? "text-primary" : "text-foreground")}>
                        {opt.label}
                      </span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-destructive text-center">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="h-12 rounded-xl" disabled={submitting}>Back</Button>
              <Button
                disabled={instruments.length === 0 || !experience || submitting}
                onClick={handleActivate}
                className="vault-cta flex-1 h-12 text-base font-semibold uppercase tracking-wide rounded-xl"
                size="lg"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Activate Vault"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Activation confirmation */}
        {step === 4 && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
            <div className="mx-auto w-20 h-20 rounded-full bg-[hsl(var(--status-success)/0.1)] border-2 border-[hsl(var(--status-success)/0.3)] flex items-center justify-center shadow-[0_0_40px_hsl(var(--status-success)/0.15)]">
              <Check className="h-10 w-10 text-[hsl(var(--status-success))]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Vault Initialized</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Your trading OS is now active. Protection rules are set. Your AI profile will get smarter with every trade.
              </p>
            </div>
            <div className="space-y-1.5 text-left max-w-xs mx-auto">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-[hsl(var(--status-success))]" />
                <span>Style: <span className="text-foreground font-medium capitalize">{style?.replace("_", " ")}</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-[hsl(var(--status-success))]" />
                <span>Balance: <span className="text-foreground font-medium font-mono">${balanceNum.toLocaleString()}</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-[hsl(var(--status-success))]" />
                <span>Instruments: <span className="text-foreground font-medium capitalize">{instruments.join(", ")}</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-[hsl(var(--status-success))]" />
                <span>AI Trader DNA: <span className="text-foreground font-medium">Seeded & Learning</span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
