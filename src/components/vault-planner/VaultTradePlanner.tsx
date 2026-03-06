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
  ChevronDown, ChevronUp, Shield, TrendingUp, DollarSign, Target,
} from "lucide-react";

type UIState = "input" | "loading" | "results";

const STORAGE_KEY = "vault_trade_planner_inputs";

function loadSaved(): Partial<PlannerInputs> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function safeCurrency(n: number | undefined | null): string {
  if (n == null || !isFinite(n) || isNaN(n)) return "—";
  return formatCurrency(n);
}

/* ─── Shared sub-components ─── */

function PanelCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 md:p-6 flex flex-col gap-4 ${className}`}
      style={{
        background: "hsl(214 22% 14%)",
        border: "1px solid hsl(213 18% 22%)",
        boxShadow: "0 4px 16px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(213 18% 24% / 0.3)",
      }}
    >
      <h3 className="text-sm font-bold text-foreground tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function PlannerInput({
  label, error, suffix, tooltip, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; suffix?: string; tooltip?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-0.5">
        {label}
        {tooltip && <XPTooltip text={tooltip} />}
      </label>
      <div className="relative">
        <input
          className={`w-full px-3 py-2.5 text-sm font-mono text-foreground rounded-lg outline-none
            transition-shadow duration-100
            focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground/40
            ${error ? "ring-1 ring-red-500/50" : ""}
            ${props.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{
            background: "hsl(212 25% 9%)",
            border: "1px solid hsl(213 18% 20%)",
          }}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
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
    <div
      className="inline-flex rounded-lg overflow-hidden"
      style={{ border: "1px solid hsl(213 18% 22%)" }}
    >
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-4 py-2 text-xs font-semibold transition-all duration-100
            ${value === opt
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
            }`}
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
      className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-100
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variant === "primary"
          ? "bg-primary text-white hover:brightness-110 active:scale-[0.98]"
          : "text-foreground hover:brightness-110 active:scale-[0.98]"
        }`}
      style={variant !== "primary" ? {
        background: "hsl(214 22% 16%)",
        border: "1px solid hsl(213 18% 22%)",
      } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

function ResultRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ borderBottom: "1px solid hsl(213 18% 16%)" }}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono ${bold ? "text-lg font-bold" : "text-sm font-semibold"} ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function DollarReadout({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
      style={{ background: "hsl(212 25% 9%)", border: "1px solid hsl(213 18% 18%)" }}
    >
      <Icon className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground/80">{label}</p>
        <p className="text-sm font-bold font-mono text-foreground">{value}</p>
      </div>
    </div>
  );
}

function VerdictBanner({ verdict, reason }: { verdict: TradeVerdict; reason: string }) {
  const config = {
    PASS: {
      bg: "hsl(160 84% 39% / 0.10)",
      border: "hsl(160 84% 39% / 0.3)",
      color: "hsl(160 84% 39%)",
      label: "PASS",
      Icon: CheckCircle2,
    },
    CAUTION: {
      bg: "hsl(38 92% 50% / 0.10)",
      border: "hsl(38 92% 50% / 0.3)",
      color: "hsl(38 92% 50%)",
      label: "CAUTION",
      Icon: AlertTriangle,
    },
    NO_TRADE: {
      bg: "hsl(0 72% 51% / 0.10)",
      border: "hsl(0 72% 51% / 0.3)",
      color: "hsl(0 72% 51%)",
      label: "NO TRADE",
      Icon: XCircle,
    },
  }[verdict];

  return (
    <div
      className="rounded-lg px-4 py-3 text-center transition-all duration-150"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      <div className="flex items-center justify-center gap-2">
        <config.Icon className="w-5 h-5" style={{ color: config.color }} />
        <p className="text-lg font-black tracking-wide" style={{ color: config.color }}>
          {config.label}
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{reason}</p>
    </div>
  );
}

function OutcomeSnapshot({ result }: { result: PlannerResult }) {
  const items = [
    { label: "If stopped", value: `-${safeCurrency(result.totalPlannedRisk)}`, negative: true },
    { label: "If TP1 hits", value: `+${safeCurrency(result.profitAtTP1)}`, negative: false },
    { label: "If TP2 hits", value: `+${safeCurrency(result.profitAtTP2)}`, negative: false },
    { label: "Capital committed", value: safeCurrency(result.totalPositionCost), negative: false },
  ];
  return (
    <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden" style={{ border: "1px solid hsl(213 18% 16%)" }}>
      {items.map((item) => (
        <div key={item.label} className="px-3 py-2.5 text-center" style={{ background: "hsl(212 25% 9%)" }}>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">{item.label}</p>
          <p className={`text-sm font-bold font-mono ${item.negative ? "text-red-400" : "text-emerald-400"}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function WhatToDoCard({ inputs, result }: { inputs: PlannerInputs; result: PlannerResult }) {
  if (result.finalContracts === 0) return null;
  return (
    <div
      className="rounded-lg p-3.5 space-y-1.5"
      style={{ background: "hsl(217 91% 60% / 0.06)", border: "1px solid hsl(217 91% 60% / 0.15)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 flex items-center gap-1.5">
        <Target className="w-3 h-3" />
        What To Do
      </p>
      <div className="text-[12px] text-foreground space-y-1 leading-relaxed">
        <p>• Enter at <strong>{safeCurrency(inputs.entryPremium)}</strong></p>
        <p>• Stop at <strong>{safeCurrency(inputs.stopPremium)}</strong></p>
        <p>• Consider quick partial near <strong>{safeCurrency(result.tp1Premium)}</strong></p>
        <p>• Main target <strong>{safeCurrency(result.rr1to2Target)}</strong></p>
        <p>• Do not exceed <strong>{result.finalContracts}</strong> contract{result.finalContracts > 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors w-full"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {title}
      </button>
      {open && (
        <div className="mt-2 text-[11px] text-muted-foreground/80 leading-relaxed pl-4.5">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

export function VaultTradePlanner() {
  const saved = loadSaved();

  const [tier, setTier] = useState<AccountTierLabel>("Small");
  const [accountSize, setAccountSize] = useState(saved.accountSize?.toString() ?? "");
  const [riskPercent, setRiskPercent] = useState(saved.riskPercent?.toString() ?? "2");
  const [debitCapPercent, setDebitCapPercent] = useState(saved.debitCapPercent?.toString() ?? "5");
  const [direction, setDirection] = useState<TradeDirection>(saved.direction ?? "Long Call");
  const [entryPremium, setEntryPremium] = useState(saved.entryPremium?.toString() ?? "");
  const [stopPremium, setStopPremium] = useState(saved.stopPremium?.toString() ?? "");
  const [tp1] = useState("30");
  const [tp2] = useState("50");
  const [ticker, setTicker] = useState(saved.ticker ?? "");
  const [dte, setDte] = useState(saved.dte?.toString() ?? "");
  const [delta, setDelta] = useState(saved.delta?.toString() ?? "");
  const [strike, setStrike] = useState(saved.strike?.toString() ?? "");
  const [chartStop, setChartStop] = useState(saved.chartStopLevel?.toString() ?? "");
  const [underlyingEntry, setUnderlyingEntry] = useState(saved.underlyingEntry?.toString() ?? "");
  const [defaultsLocked, setDefaultsLocked] = useState(true);
  const [autoTierEnabled, setAutoTierEnabled] = useState(true);

  const [uiState, setUIState] = useState<UIState>("input");
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detect tier on account size change
  useEffect(() => {
    if (!autoTierEnabled) return;
    const size = parseFloat(accountSize);
    if (!size || size <= 0) return;
    const detected = detectTier(size);
    setTier(detected);
    const d = TIER_DEFAULTS[detected];
    setRiskPercent(d.riskPercent.toString());
    setDebitCapPercent(d.debitCapPercent.toString());
  }, [accountSize, autoTierEnabled]);

  const handleTierChange = (t: AccountTierLabel) => {
    setTier(t);
    setAutoTierEnabled(false);
    const d = TIER_DEFAULTS[t];
    setRiskPercent(d.riskPercent.toString());
    setDebitCapPercent(d.debitCapPercent.toString());
    setDefaultsLocked(true);
  };

  const buildInputs = useCallback((): PlannerInputs => ({
    accountSize: parseFloat(accountSize) || 0,
    riskPercent: parseFloat(riskPercent) || 0,
    debitCapPercent: parseFloat(debitCapPercent) || 0,
    direction,
    entryPremium: parseFloat(entryPremium) || 0,
    stopPremium: parseFloat(stopPremium) || 0,
    tp1Percent: parseFloat(tp1) || 30,
    tp2Percent: parseFloat(tp2) || 50,
    ticker: ticker || undefined,
    dte: dte ? parseFloat(dte) : undefined,
    delta: delta ? parseFloat(delta) : undefined,
    strike: strike ? parseFloat(strike) : undefined,
    chartStopLevel: chartStop ? parseFloat(chartStop) : undefined,
    underlyingEntry: underlyingEntry ? parseFloat(underlyingEntry) : undefined,
  }), [accountSize, riskPercent, debitCapPercent, direction, entryPremium, stopPremium, tp1, tp2, ticker, dte, delta, strike, chartStop, underlyingEntry]);

  const liveResult: PlannerResult | null = (() => {
    const inputs = buildInputs();
    const errs = validateInputs(inputs);
    if (errs.length > 0) return null;
    const r = calculatePlan(inputs);
    if (!isFinite(r.finalContracts) || isNaN(r.totalPlannedRisk)) return null;
    return r;
  })();

  const isValid = liveResult !== null;

  // Live dollar readouts
  const acctSize = parseFloat(accountSize) || 0;
  const maxRiskDollars = acctSize * ((parseFloat(riskPercent) || 0) / 100);
  const maxSpendDollars = acctSize * ((parseFloat(debitCapPercent) || 0) / 100);

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
    const inputs = buildInputs();
    setResult(calculatePlan(inputs));
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
    setDte("");
    setDelta("");
    setStrike("");
    setChartStop("");
    setUnderlyingEntry("");
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
    setDte("");
    setDelta("");
    setStrike("");
    setChartStop("");
    setUnderlyingEntry("");
    setErrors({});
    toast.success("Example loaded");
  };

  const handleCopyPlan = () => {
    const inputs = buildInputs();
    const errs = validateInputs(inputs);
    if (errs.length > 0) { toast.error("Fix errors before copying"); return; }
    const res = calculatePlan(inputs);
    navigator.clipboard.writeText(buildCopyText(inputs, res));
    toast.success("Trade plan copied");
  };

  if (uiState === "loading") {
    return <TradePlannerLoading onComplete={handleLoadingComplete} onCancel={() => setUIState("input")} />;
  }

  if (uiState === "results" && result) {
    return <TradePlannerResults inputs={buildInputs()} result={result} onBack={() => setUIState("input")} />;
  }

  const liveThetaWarning = liveResult?.thetaWarning ?? null;

  return (
    <div
      className="w-full max-w-[1400px] mx-auto rounded-2xl p-5 md:p-8 space-y-6"
      style={{
        background: "hsl(214 24% 11%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 48px hsl(0 0% 0% / 0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        backgroundImage: "radial-gradient(ellipse 60% 200px at 50% 0%, hsl(217 60% 28% / 0.18), transparent)",
      }}
    >
      {/* ─── Header ─── */}
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          <span className="font-black">VAULT</span>{" "}
          <span className="font-normal text-muted-foreground">Trade Planner</span>
        </h1>
        <div
          className="mx-auto w-24 h-px"
          style={{ background: "hsl(213 18% 25%)" }}
        />
        <p className="text-xs text-muted-foreground">
          Long Calls / Long Puts only • Pre-Trade Command Center
        </p>
        <p className="text-sm text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
          You enter the setup. VAULT builds the plan.
        </p>
      </div>

      {/* ─── 3-Panel Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        {/* ═══ LEFT: Account ═══ */}
        <PanelCard title="Account">
          <PlannerInput
            label="Account Size"
            type="number"
            value={accountSize}
            onChange={(e) => setAccountSize(e.target.value)}
            error={errors.accountSize}
            placeholder="$10,000"
            tooltip="Your total trading account balance. VAULT uses this to calculate safe position sizes."
          />

          {/* Auto-detected tier badge */}
          {acctSize > 0 && (
            <div
              className="rounded-lg px-3 py-2 flex items-center gap-2"
              style={{ background: "hsl(217 91% 60% / 0.06)", border: "1px solid hsl(217 91% 60% / 0.15)" }}
            >
              <Shield className="w-3.5 h-3.5 text-primary/70" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground/80">
                  {autoTierEnabled ? "Detected Account Type" : "Selected Account Type"}
                </p>
                <p className="text-xs font-bold text-foreground">{tier}</p>
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                {TIER_DEFAULTS[tier].riskPercent}% loss cap • {TIER_DEFAULTS[tier].debitCapPercent}% spend cap
              </p>
            </div>
          )}

          <div className="space-y-2">
            <SegmentedToggle
              options={["Small", "Medium", "Large"] as AccountTierLabel[]}
              value={tier}
              onChange={handleTierChange}
            />
          </div>

          <PlannerInput
            label="% I Can Lose"
            type="number"
            step="0.1"
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            error={errors.riskPercent}
            suffix="%"
            disabled={defaultsLocked}
            tooltip="Maximum percentage of your account you are willing to lose on this single trade."
          />

          <PlannerInput
            label="Max % I Can Spend"
            type="number"
            step="0.1"
            value={debitCapPercent}
            onChange={(e) => setDebitCapPercent(e.target.value)}
            error={errors.debitCapPercent}
            suffix="%"
            disabled={defaultsLocked}
            tooltip="Maximum percentage of your account that can go toward buying contracts. Spending and risk are different — you can spend $500 but risk only $200 if your stop is tight."
          />

          <button
            onClick={() => setDefaultsLocked(!defaultsLocked)}
            className="inline-flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
          >
            {defaultsLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {defaultsLocked ? "Unlock Custom" : "Lock Defaults"}
          </button>

          {/* Live dollar readouts */}
          {acctSize > 0 && (
            <div className="space-y-2 pt-1">
              <DollarReadout
                label="Max risk this trade"
                value={safeCurrency(maxRiskDollars)}
                icon={Shield}
              />
              <DollarReadout
                label="Max spend this trade"
                value={safeCurrency(maxSpendDollars)}
                icon={DollarSign}
              />
            </div>
          )}
        </PanelCard>

        {/* ═══ CENTER: Trade ═══ */}
        <PanelCard title="Trade">
          {/* Optional Ticker */}
          <PlannerInput
            label="Ticker (optional)"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="SPY, AAPL, QQQ…"
          />

          <SegmentedToggle
            options={["Long Call", "Long Put"] as TradeDirection[]}
            value={direction}
            onChange={(v) => setDirection(v as TradeDirection)}
          />

          <PlannerInput
            label="Option Buy Price"
            type="number"
            step="0.01"
            value={entryPremium}
            onChange={(e) => setEntryPremium(e.target.value)}
            error={errors.entryPremium}
            placeholder="1.20"
            tooltip="The premium you will pay per share for the option contract. For example, $1.20 means the contract costs $120 (× 100 shares)."
          />

          <PlannerInput
            label="Option Stop Price"
            type="number"
            step="0.01"
            value={stopPremium}
            onChange={(e) => setStopPremium(e.target.value)}
            error={errors.stopPremium}
            placeholder="0.80"
            tooltip="If the option premium drops to this price, you cut the trade. This is your planned exit on a losing trade."
          />

          <p className="text-[11px] text-muted-foreground/60 -mt-1">
            If option price hits your stop, cut the trade.
          </p>

          {/* Theta warning */}
          {liveThetaWarning && (
            <div
              className="rounded-lg px-3 py-2 text-[11px] font-medium flex items-center gap-1.5"
              style={{
                background: "hsl(38 92% 50% / 0.08)",
                border: "1px solid hsl(38 92% 50% / 0.2)",
                color: "hsl(38 92% 50%)",
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {liveThetaWarning}
            </div>
          )}

          {/* Contract Guidance — collapsed */}
          <CollapsibleSection title="How to choose a contract">
            <div className="space-y-1.5 text-[11px] text-muted-foreground/80">
              <p>• <strong>Premium</strong> is the cost of one option contract (per share × 100).</p>
              <p>• More expensive contracts reduce your allowed size.</p>
              <p>• Cheap contracts are not always safer — they may have worse delta or wider spreads.</p>
              <p>• Choose contracts that fit your account, risk plan, and stop level.</p>
              <p>• VAULT does not recommend specific strikes — that is your chart-based decision.</p>
            </div>
          </CollapsibleSection>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <ActionButton variant="primary" onClick={handleGenerate} disabled={!isValid}>
              Generate
            </ActionButton>
            <ActionButton onClick={handleLoadExample}>Load Example</ActionButton>
            <ActionButton onClick={handleReset}>Reset</ActionButton>
            <ActionButton onClick={handleCopyPlan} disabled={!isValid}>
              <span className="flex items-center gap-1">
                <Copy className="w-3 h-3" />
                Copy Plan
              </span>
            </ActionButton>
          </div>
        </PanelCard>

        {/* ═══ RIGHT: Results ═══ */}
        <PanelCard title="Results">
          {isValid && liveResult ? (
            <div className="space-y-3">
              {/* Verdict Banner */}
              <VerdictBanner verdict={liveResult.verdict} reason={liveResult.verdictReason} />

              {/* Hero metrics — verdict-first hierarchy */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid hsl(213 18% 16%)" }}
              >
                <ResultRow label="How Many Contracts" value={`${liveResult.finalContracts}`} bold accent />
                <ResultRow label="Planned Loss If Stop Hits" value={`-${safeCurrency(liveResult.totalPlannedRisk)}`} bold />
                <ResultRow label="Money Needed to Enter" value={safeCurrency(liveResult.totalPositionCost)} />
              </div>

              {/* What To Do */}
              <WhatToDoCard inputs={buildInputs()} result={liveResult} />

              {/* Outcome Snapshot */}
              {liveResult.finalContracts > 0 && (
                <OutcomeSnapshot result={liveResult} />
              )}

              {/* Why This Size — collapsed */}
              <CollapsibleSection title="Why this size?">
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                  {liveResult.sizingExplanation}
                </p>
              </CollapsibleSection>

              {/* Secondary targets */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid hsl(213 18% 16%)" }}
              >
                <ResultRow label="Main Target (1:2)" value={safeCurrency(liveResult.rr1to2Target)} />
                <ResultRow label="Quick Profit (TP1)" value={safeCurrency(liveResult.tp1Premium)} />
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Bigger Profit (TP2)</span>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {safeCurrency(liveResult.tp2Premium)}
                  </span>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex items-center justify-center gap-5">
                <StatusCheck label="Risk Check" pass={liveResult.riskCheckPass} />
                <StatusCheck label="Debit Check" pass={liveResult.debitCheckPass} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground/50 text-center leading-relaxed">
                Enter your account size, option buy price, and option stop price.
                <br />
                Results will appear here.
              </p>
            </div>
          )}
        </PanelCard>
      </div>

      {/* ─── Footer microcopy ─── */}
      <div className="text-center space-y-2 pb-4">
        <p className="text-xs text-muted-foreground/70">
          <strong className="text-muted-foreground">"How many contracts"</strong> is based on
          <strong className="text-foreground"> BOTH</strong> your risk limit and your spend cap.{" "}
          <span className="italic">This helps prevent oversizing.</span>
        </p>
        <p className="text-[11px] text-muted-foreground/50 italic">
          Cut at your stop. Planned loss is not a guarantee.
        </p>
      </div>
    </div>
  );
}

/* Status badge for pass/fail */
function StatusCheck({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      {pass ? (
        <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(160 84% 39%)" }} />
      ) : (
        <XCircle className="w-4 h-4" style={{ color: "hsl(0 72% 51%)" }} />
      )}
      <span style={{ color: pass ? "hsl(160 84% 39%)" : "hsl(0 72% 51%)" }}>
        {label} {pass ? "PASS" : "FAIL"}
      </span>
    </span>
  );
}
