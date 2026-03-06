import { useState, useCallback, useEffect } from "react";
import {
  PlannerInputs,
  PlannerResult,
  AccountTierLabel,
  TradeDirection,
  TIER_DEFAULTS,
  validateInputs,
  calculatePlan,
  buildCopyText,
  formatCurrency,
} from "@/lib/tradePlannerCalc";
import { TradePlannerLoading } from "./TradePlannerLoading";
import { TradePlannerResults } from "./TradePlannerResults";
import { toast } from "sonner";
import { Lock, Unlock, AlertTriangle, CheckCircle2, XCircle, Copy } from "lucide-react";

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
      className={`rounded-2xl p-5 md:p-6 flex flex-col gap-5 ${className}`}
      style={{
        background: "hsl(214 24% 11%)",
        border: "1px solid hsl(213 18% 18%)",
        boxShadow: "0 8px 32px hsl(0 0% 0% / 0.35), inset 0 1px 0 hsl(213 18% 22% / 0.3)",
      }}
    >
      <h3 className="text-sm font-bold text-foreground tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function PlannerInput({
  label, error, suffix, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; suffix?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          className={`w-full px-3 py-2.5 text-sm font-mono text-foreground rounded-lg outline-none
            focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40
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
          className={`px-4 py-2 text-xs font-semibold transition-colors
            ${value === opt
              ? "bg-primary text-white"
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
      className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variant === "primary"
          ? "bg-primary text-white hover:brightness-110"
          : "text-foreground hover:brightness-110"
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

function ResultRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: "1px solid hsl(213 18% 16%)" }}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono ${bold ? "text-lg font-bold" : "text-sm font-semibold"} text-foreground`}>
        {value}
      </span>
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

  const [uiState, setUIState] = useState<UIState>("input");
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTierChange = (t: AccountTierLabel) => {
    setTier(t);
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
    handleTierChange("Medium");
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
          Long Calls / Long Puts only • Simple Mode
        </p>
        <p className="text-sm text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
          You enter the setup. VAULT builds the plan.
          <br />
          No guessing. No oversizing. No random sizing.
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
          />

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
          />

          <button
            onClick={() => setDefaultsLocked(!defaultsLocked)}
            className="inline-flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
          >
            {defaultsLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {defaultsLocked ? "Unlock Custom" : "Lock Defaults"}
          </button>
        </PanelCard>

        {/* ═══ CENTER: Trade ═══ */}
        <PanelCard title="Trade">
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
          />

          <PlannerInput
            label="Option Stop Price"
            type="number"
            step="0.01"
            value={stopPremium}
            onChange={(e) => setStopPremium(e.target.value)}
            error={errors.stopPremium}
            placeholder="0.80"
          />

          <p className="text-[11px] text-muted-foreground/60 -mt-2">
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
                Copy Trade Plan
              </span>
            </ActionButton>
          </div>
        </PanelCard>

        {/* ═══ RIGHT: Results ═══ */}
        <PanelCard title="Results">
          {/* PASS / NO TRADE banner */}
          {isValid && liveResult ? (
            <>
              <div
                className="rounded-lg px-4 py-3 text-center"
                style={{
                  background: liveResult.finalContracts > 0
                    ? "hsl(160 84% 39% / 0.12)"
                    : "hsl(0 72% 51% / 0.12)",
                  border: `1px solid ${liveResult.finalContracts > 0
                    ? "hsl(160 84% 39% / 0.3)"
                    : "hsl(0 72% 51% / 0.3)"
                  }`,
                }}
              >
                <p
                  className="text-lg font-black tracking-wide"
                  style={{
                    color: liveResult.finalContracts > 0
                      ? "hsl(160 84% 39%)"
                      : "hsl(0 72% 51%)",
                  }}
                >
                  {liveResult.finalContracts > 0 ? "PASS" : "NO TRADE"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {liveResult.finalContracts > 0
                    ? "Trade size is within your risk and spend rules."
                    : "This setup does not fit your account rules."}
                </p>
              </div>

              {/* Result rows */}
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid hsl(213 18% 16%)" }}
              >
                <ResultRow label="How Many Contracts" value={`${liveResult.finalContracts}`} bold />
                <ResultRow label="Option Stop Price" value={safeCurrency(buildInputs().stopPremium)} />
                <ResultRow label="Planned Loss If Stop Hits" value={`-${safeCurrency(liveResult.totalPlannedRisk)}`} />
                <ResultRow label="Money Needed to Enter" value={safeCurrency(liveResult.totalPositionCost)} />
                <ResultRow label="Main Target (1:2)" value={safeCurrency(liveResult.rr1to2Target)} />
                <ResultRow label="Quick Profit Idea (TP1)" value={safeCurrency(liveResult.tp1Premium)} />
                <div
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-xs text-muted-foreground">Bigger Profit Idea (TP2)</span>
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
            </>
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
