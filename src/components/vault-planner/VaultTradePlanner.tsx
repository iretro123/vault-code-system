import { useState, useCallback, useEffect } from "react";
import {
  PlannerInputs,
  PlannerResult,
  AccountTierLabel,
  TradeDirection,
  TradeVerdict,
  TIER_DEFAULTS,
  detectTier,
  validateInputs,
  calculatePlan,
  buildCopyText,
  formatCurrency,
} from "@/lib/tradePlannerCalc";
import { TradePlannerLoading } from "./TradePlannerLoading";
import { TradePlannerResults } from "./TradePlannerResults";
import { XPTooltip } from "./XPTooltip";
import { toast } from "sonner";
import {
  Lock, Unlock, AlertTriangle, CheckCircle2, XCircle, Copy,
  ChevronDown, ChevronUp, Shield,
} from "lucide-react";

type UIState = "input" | "loading" | "results";
const STORAGE_KEY = "vault_trade_planner_inputs";

function loadSaved(): Partial<PlannerInputs> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function safeCurrency(n: number | undefined | null): string {
  if (n == null || !isFinite(n) || isNaN(n)) return "—";
  return formatCurrency(n);
}

/* ─── Sub-components ─── */

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4 md:p-5 flex flex-col gap-3"
      style={{
        background: "hsl(214 22% 14%)",
        border: "1px solid hsl(213 18% 22%)",
        boxShadow: "0 4px 16px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(213 18% 24% / 0.3)",
      }}
    >
      <h3 className="text-xs font-bold text-foreground tracking-wide uppercase">{title}</h3>
      {children}
    </div>
  );
}

function PlannerInput({
  label, error, suffix, tooltip, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; suffix?: string; tooltip?: string }) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] font-medium text-muted-foreground inline-flex items-center gap-0.5">
        {label}
        {tooltip && <XPTooltip text={tooltip} />}
      </label>
      <div className="relative">
        <input
          className={`w-full px-2.5 py-2 text-sm font-mono text-foreground rounded-lg outline-none
            transition-shadow duration-100
            focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40
            ${error ? "ring-1 ring-red-500/50" : ""}
            ${props.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{
            background: "hsl(212 25% 9%)",
            border: "1px solid hsl(213 18% 20%)",
          }}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

function SegmentedToggle<T extends string>({
  options, value, onChange,
}: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden" style={{ border: "1px solid hsl(213 18% 22%)" }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-[11px] font-semibold transition-all duration-100
            ${value === opt ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          style={value !== opt ? { background: "hsl(214 22% 14%)" } : {}}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ActionButton({
  children, variant = "default", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" }) {
  return (
    <button
      className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-100
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variant === "primary"
          ? "bg-primary text-white hover:brightness-110 active:scale-[0.98]"
          : "text-foreground hover:brightness-110 active:scale-[0.98]"}`}
      style={variant !== "primary" ? { background: "hsl(214 22% 16%)", border: "1px solid hsl(213 18% 22%)" } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

function ResultRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid hsl(213 18% 16%)" }}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`font-mono ${bold ? "text-base font-bold" : "text-sm font-semibold"} ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function VerdictBanner({ verdict, reason }: { verdict: TradeVerdict; reason: string }) {
  const config = {
    SAFE: { bg: "hsl(160 84% 39% / 0.10)", border: "hsl(160 84% 39% / 0.3)", color: "hsl(160 84% 39%)", label: "SAFE", Icon: CheckCircle2 },
    AGGRESSIVE: { bg: "hsl(38 92% 50% / 0.10)", border: "hsl(38 92% 50% / 0.3)", color: "hsl(38 92% 50%)", label: "AGGRESSIVE", Icon: AlertTriangle },
    NO_TRADE: { bg: "hsl(0 72% 51% / 0.10)", border: "hsl(0 72% 51% / 0.3)", color: "hsl(0 72% 51%)", label: "NO TRADE", Icon: XCircle },
  }[verdict];

  return (
    <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: config.bg, border: `1px solid ${config.border}` }}>
      <div className="flex items-center justify-center gap-1.5">
        <config.Icon className="w-4 h-4" style={{ color: config.color }} />
        <p className="text-base font-black tracking-wide" style={{ color: config.color }}>{config.label}</p>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{reason}</p>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors w-full"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {title}
      </button>
      {open && <div className="mt-1.5 text-[10px] text-muted-foreground/80 leading-relaxed pl-4">{children}</div>}
    </div>
  );
}

function StatusCheck({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
      {pass ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(160 84% 39%)" }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: "hsl(0 72% 51%)" }} />}
      <span style={{ color: pass ? "hsl(160 84% 39%)" : "hsl(0 72% 51%)" }}>{label}</span>
    </span>
  );
}

/* ─── Main Component ─── */

export function VaultTradePlanner() {
  const saved = loadSaved();

  const [tier, setTier] = useState<AccountTierLabel>("Small");
  const [accountSize, setAccountSize] = useState(saved.accountSize?.toString() ?? "");
  const [riskPercent, setRiskPercent] = useState(saved.riskPercent?.toString() ?? "2");
  const [preferredSpendPercent, setPreferredSpendPercent] = useState(saved.preferredSpendPercent?.toString() ?? "5");
  const [hardMaxSpendPercent, setHardMaxSpendPercent] = useState(saved.hardMaxSpendPercent?.toString() ?? "10");
  const [direction, setDirection] = useState<TradeDirection>(saved.direction ?? "Long Call");
  const [entryPremium, setEntryPremium] = useState(saved.entryPremium?.toString() ?? "");
  const [stopPremium, setStopPremium] = useState(saved.stopPremium?.toString() ?? "");
  const [ticker, setTicker] = useState(saved.ticker ?? "");
  const [defaultsLocked, setDefaultsLocked] = useState(true);
  const [autoTierEnabled, setAutoTierEnabled] = useState(true);

  const [uiState, setUIState] = useState<UIState>("input");
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detect tier
  useEffect(() => {
    if (!autoTierEnabled) return;
    const size = parseFloat(accountSize);
    if (!size || size <= 0) return;
    const detected = detectTier(size);
    setTier(detected);
    const d = TIER_DEFAULTS[detected];
    setRiskPercent(d.riskPercent.toString());
    setPreferredSpendPercent(d.preferredSpendPercent.toString());
    setHardMaxSpendPercent(d.hardMaxSpendPercent.toString());
  }, [accountSize, autoTierEnabled]);

  const handleTierChange = (t: AccountTierLabel) => {
    setTier(t);
    setAutoTierEnabled(false);
    const d = TIER_DEFAULTS[t];
    setRiskPercent(d.riskPercent.toString());
    setPreferredSpendPercent(d.preferredSpendPercent.toString());
    setHardMaxSpendPercent(d.hardMaxSpendPercent.toString());
    setDefaultsLocked(true);
  };

  const buildInputs = useCallback((): PlannerInputs => ({
    accountSize: parseFloat(accountSize) || 0,
    riskPercent: parseFloat(riskPercent) || 0,
    preferredSpendPercent: parseFloat(preferredSpendPercent) || 0,
    hardMaxSpendPercent: parseFloat(hardMaxSpendPercent) || 0,
    direction,
    entryPremium: parseFloat(entryPremium) || 0,
    stopPremium: parseFloat(stopPremium) || 0,
    ticker: ticker || undefined,
  }), [accountSize, riskPercent, preferredSpendPercent, hardMaxSpendPercent, direction, entryPremium, stopPremium, ticker]);

  const liveResult: PlannerResult | null = (() => {
    const inputs = buildInputs();
    const errs = validateInputs(inputs);
    if (errs.length > 0) return null;
    const r = calculatePlan(inputs);
    if (!isFinite(r.finalContracts) || isNaN(r.totalPlannedRisk)) return null;
    return r;
  })();

  const isValid = liveResult !== null;
  const acctSize = parseFloat(accountSize) || 0;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(buildInputs())); } catch {}
  }, [buildInputs]);

  const handleGenerate = () => {
    const inputs = buildInputs();
    const errs = validateInputs(inputs);
    if (errs.length > 0) {
      const map: Record<string, string> = {};
      errs.forEach((e) => (map[e.field] = e.message));
      setErrors(map);
      return;
    }
    setErrors({});
    setUIState("loading");
  };

  const handleLoadingComplete = useCallback(() => {
    setResult(calculatePlan(buildInputs()));
    setUIState("results");
  }, [buildInputs]);

  const handleReset = () => {
    handleTierChange("Small");
    setAutoTierEnabled(true);
    setAccountSize("");
    setDirection("Long Call");
    setEntryPremium("");
    setStopPremium("");
    setTicker("");
    setErrors({});
    setResult(null);
    setUIState("input");
    setDefaultsLocked(true);
  };

  const handleLoadExample = () => {
    setAutoTierEnabled(true);
    setAccountSize("10000");
    setDirection("Long Call");
    setEntryPremium("1.20");
    setStopPremium("0.80");
    setTicker("");
    setErrors({});
    toast.success("Example loaded");
  };

  const handleCopyPlan = () => {
    const inputs = buildInputs();
    const errs = validateInputs(inputs);
    if (errs.length > 0) { toast.error("Fix errors before copying"); return; }
    navigator.clipboard.writeText(buildCopyText(inputs, calculatePlan(inputs)));
    toast.success("Trade plan copied");
  };

  if (uiState === "loading") {
    return <TradePlannerLoading onComplete={handleLoadingComplete} onCancel={() => setUIState("input")} />;
  }

  if (uiState === "results" && result) {
    return <TradePlannerResults inputs={buildInputs()} result={result} onBack={() => setUIState("input")} />;
  }

  const tierDefaults = TIER_DEFAULTS[tier];

  return (
    <div
      className="w-full max-w-[1400px] mx-auto rounded-2xl p-4 md:p-6 space-y-4"
      style={{
        background: "hsl(214 24% 11%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 48px hsl(0 0% 0% / 0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        backgroundImage: "radial-gradient(ellipse 60% 200px at 50% 0%, hsl(217 60% 28% / 0.18), transparent)",
      }}
    >
      {/* Header */}
      <div className="text-center space-y-1 pt-1">
        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
          <span className="font-black">VAULT</span>{" "}
          <span className="font-normal text-muted-foreground">Trade Planner</span>
        </h1>
        <p className="text-[10px] text-muted-foreground/60">Long Calls / Long Puts • Pre-Trade Sizing</p>
      </div>

      {/* 3-Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">

        {/* ═══ Account ═══ */}
        <PanelCard title="Account">
          <PlannerInput
            label="Account Size"
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(e.target.value)}
            error={errors.accountSize}
            placeholder="10,000"
            tooltip="Your total trading account balance."
          />

          {/* Detected tier badge */}
          {acctSize > 0 && (
            <div className="rounded-lg px-2.5 py-1.5 flex items-center gap-2" style={{ background: "hsl(217 91% 60% / 0.06)", border: "1px solid hsl(217 91% 60% / 0.12)" }}>
              <Shield className="w-3 h-3 text-primary/60 flex-shrink-0" />
              <p className="text-[10px] text-muted-foreground">
                <span className="font-bold text-foreground">{tier}</span>
                {" • "}{tierDefaults.riskPercent}% risk • {tierDefaults.preferredSpendPercent}% preferred • {tierDefaults.hardMaxSpendPercent}% hard max
              </p>
            </div>
          )}

          <SegmentedToggle
            options={["Small", "Medium", "Large"] as AccountTierLabel[]}
            value={tier}
            onChange={handleTierChange}
          />

          {/* Custom overrides */}
          {!defaultsLocked && (
            <div className="space-y-2">
              <PlannerInput label="Risk %" type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} suffix="%" error={errors.riskPercent} />
              <PlannerInput label="Preferred Spend %" type="number" step="0.1" value={preferredSpendPercent} onChange={(e) => setPreferredSpendPercent(e.target.value)} suffix="%" error={errors.preferredSpendPercent} />
              <PlannerInput label="Hard Max Spend %" type="number" step="0.1" value={hardMaxSpendPercent} onChange={(e) => setHardMaxSpendPercent(e.target.value)} suffix="%" error={errors.hardMaxSpendPercent} />
            </div>
          )}

          <button
            onClick={() => setDefaultsLocked(!defaultsLocked)}
            className="inline-flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors"
          >
            {defaultsLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
            {defaultsLocked ? "Unlock Custom" : "Lock Defaults"}
          </button>

          {/* Premium Fit */}
          {acctSize > 0 && liveResult && (
            <div className="rounded-lg px-2.5 py-2 space-y-0.5" style={{ background: "hsl(212 25% 9%)", border: "1px solid hsl(213 18% 18%)" }}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">Premium Fit</p>
              <p className="text-[11px] text-foreground">
                Ideal: up to <span className="font-bold font-mono text-primary">{safeCurrency(liveResult.idealPremiumMax)}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Aggressive max: up to <span className="font-semibold font-mono">{safeCurrency(liveResult.aggressivePremiumMax)}</span>
              </p>
            </div>
          )}
        </PanelCard>

        {/* ═══ Trade ═══ */}
        <PanelCard title="Trade">
          <SegmentedToggle
            options={["Long Call", "Long Put"] as TradeDirection[]}
            value={direction}
            onChange={(v) => setDirection(v as TradeDirection)}
          />

          <PlannerInput
            label="Buy Price"
            type="number"
            step="0.01"
            value={entryPremium}
            onChange={(e) => setEntryPremium(e.target.value)}
            error={errors.entryPremium}
            placeholder="1.20"
            tooltip="Premium you pay per share (× 100 = contract cost)."
          />

          <PlannerInput
            label="Stop Price"
            type="number"
            step="0.01"
            value={stopPremium}
            onChange={(e) => setStopPremium(e.target.value)}
            error={errors.stopPremium}
            placeholder="0.80"
            tooltip="If the option drops to this price, cut the trade."
          />

          <p className="text-[10px] text-muted-foreground/50 -mt-1">Cut trade if option hits your stop.</p>

          {/* Actions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <ActionButton variant="primary" onClick={handleGenerate} disabled={!isValid}>Generate</ActionButton>
            <ActionButton onClick={handleLoadExample}>Example</ActionButton>
            <ActionButton onClick={handleReset}>Reset</ActionButton>
            <ActionButton onClick={handleCopyPlan} disabled={!isValid}>
              <span className="flex items-center gap-1"><Copy className="w-2.5 h-2.5" />Copy</span>
            </ActionButton>
          </div>
        </PanelCard>

        {/* ═══ Results ═══ */}
        <PanelCard title="Results">
          {isValid && liveResult ? (
            <div className="space-y-2.5">
              <VerdictBanner verdict={liveResult.verdict} reason={liveResult.verdictReason} />

              {/* Hero metrics */}
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid hsl(213 18% 16%)" }}>
                {liveResult.safeContracts !== liveResult.maxContracts && liveResult.maxContracts > 0 ? (
                  <>
                    <ResultRow label="Safe Contracts" value={`${liveResult.safeContracts}`} bold accent />
                    <ResultRow label="Max Contracts" value={`${liveResult.maxContracts}`} />
                  </>
                ) : (
                  <ResultRow label="Contracts" value={`${liveResult.finalContracts}`} bold accent />
                )}
                <ResultRow label="Planned Loss" value={liveResult.finalContracts > 0 ? `-${safeCurrency(liveResult.totalPlannedRisk)}` : "—"} bold />
                <ResultRow label="Entry Cost" value={safeCurrency(liveResult.totalPositionCost)} />
              </div>

              {/* Targets */}
              {liveResult.finalContracts > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ border: "1px solid hsl(213 18% 16%)" }}>
                  <ResultRow label="TP1 (1:1)" value={`${safeCurrency(liveResult.tp1Premium)}  +${safeCurrency(liveResult.profitAtTP1)}`} />
                  <ResultRow label="Main Target (1:2)" value={`${safeCurrency(liveResult.mainTarget)}  +${safeCurrency(liveResult.profitAtMain)}`} accent />
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[10px] text-muted-foreground">TP2 (1:3)</span>
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {safeCurrency(liveResult.tp2Premium)}  +{safeCurrency(liveResult.profitAtTP2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Why this size */}
              <CollapsibleSection title="Why this result?">
                <p>{liveResult.sizingExplanation}</p>
              </CollapsibleSection>

              {/* Status badges */}
              <div className="flex items-center justify-center gap-4">
                <StatusCheck label="Risk" pass={liveResult.riskCheckPass} />
                <StatusCheck label="Preferred Spend" pass={liveResult.preferredSpendCheckPass} />
                <StatusCheck label="Hard Max" pass={liveResult.hardSpendCheckPass} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-6">
              <p className="text-xs text-muted-foreground/50 text-center leading-relaxed">
                Enter account size, buy price, and stop price.<br />Results appear here.
              </p>
            </div>
          )}
        </PanelCard>
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-muted-foreground/40 pb-2">
        Cut at your stop. Planned loss is not a guarantee.
      </p>
    </div>
  );
}
