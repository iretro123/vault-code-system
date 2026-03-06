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
  Lock, Unlock, CheckCircle2, XCircle, Copy,
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

/* ─── Styles ─── */
const panelBg = "hsl(220 13% 10%)";
const panelBorder = "1px solid hsl(220 10% 18%)";
const inputBg = "hsl(220 14% 8%)";
const inputBorder = "1px solid hsl(220 10% 20%)";
const rowBorder = "1px solid hsl(220 10% 14%)";

/* ─── Sub-components ─── */

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 md:p-5 flex flex-col gap-3"
      style={{ background: panelBg, border: panelBorder }}
    >
      <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
      {children}
    </div>
  );
}

function FieldRow({
  label, tooltip, children, error,
}: { label: string; tooltip?: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1">
        {label}
        {tooltip && <XPTooltip text={tooltip} />}
      </label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

function FieldInput({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm font-mono text-foreground rounded-lg outline-none
        transition-shadow duration-100 text-right
        focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40
        ${error ? "ring-1 ring-red-500/50" : ""}
        ${props.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{ background: inputBg, border: inputBorder }}
      {...props}
    />
  );
}

function SegmentedToggle<T extends string>({
  options, value, onChange, disabled,
}: { options: T[]; value: T; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className={`inline-flex rounded-lg overflow-hidden ${disabled ? "opacity-50 pointer-events-none" : ""}`} style={{ border: panelBorder }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => !disabled && onChange(opt)}
          disabled={disabled}
          className={`px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-100
            ${disabled ? "cursor-not-allowed" : ""}
            ${value === opt ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          style={value !== opt ? { background: panelBg } : {}}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Btn({
  children, primary, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      className={`px-3.5 py-2 text-[11px] font-semibold rounded-lg transition-all duration-100
        disabled:opacity-40 disabled:cursor-not-allowed
        ${primary
          ? "bg-primary text-white hover:brightness-110 active:scale-[0.98]"
          : "text-foreground hover:brightness-110 active:scale-[0.98]"}`}
      style={!primary ? { background: "hsl(220 13% 14%)", border: panelBorder } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

function ResultRow({ label, value, large, accent }: { label: string; value: string; large?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: rowBorder }}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`font-mono ${large ? "text-xl font-black" : "text-base font-bold"} ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function VerdictBanner({ verdict, reason }: { verdict: TradeVerdict; reason: string }) {
  const config = {
    SAFE: { bg: "hsl(142 71% 45% / 0.15)", border: "hsl(142 71% 45% / 0.4)", color: "hsl(142 71% 45%)", label: "PASS", explanation: "This trade fits comfortably inside your account rules." },
    AGGRESSIVE: { bg: "hsl(38 92% 50% / 0.12)", border: "hsl(38 92% 50% / 0.4)", color: "hsl(38 92% 50%)", label: "AGGRESSIVE", explanation: "This trade works, but it is at the top end of your size range." },
    NO_TRADE: { bg: "hsl(0 72% 51% / 0.12)", border: "hsl(0 72% 51% / 0.4)", color: "hsl(0 72% 51%)", label: "NO TRADE", explanation: "This trade is too large for your account. Lower the premium or widen your stop." },
  }[verdict];

  return (
    <div className="rounded-lg px-4 py-3 text-center" style={{ background: config.bg, border: `1px solid ${config.border}` }}>
      <p className="text-xl font-black tracking-widest uppercase" style={{ color: config.color }}>{config.label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{config.explanation}</p>
    </div>
  );
}

function StatusCheck({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
      {pass
        ? <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(142 71% 45%)" }} />
        : <XCircle className="w-4 h-4" style={{ color: "hsl(0 72% 51%)" }} />}
      <span className="text-muted-foreground">{label}</span>
      <span style={{ color: pass ? "hsl(142 71% 45%)" : "hsl(0 72% 51%)" }}>{pass ? "PASS" : "FAIL"}</span>
    </span>
  );
}

function GuidanceChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 text-[9px] font-semibold rounded-md text-primary/80 hover:text-primary transition-colors"
      style={{ background: "hsl(217 91% 60% / 0.08)", border: "1px solid hsl(217 91% 60% / 0.15)" }}
    >
      {label}
    </button>
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
  

  const [uiState, setUIState] = useState<UIState>("input");
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detect tier (always active when account size exists)
  useEffect(() => {
    const size = parseFloat(accountSize);
    if (!size || size <= 0) {
      // Reset to defaults when cleared
      setTier("Small");
      const d = TIER_DEFAULTS["Small"];
      setRiskPercent(d.riskPercent.toString());
      setPreferredSpendPercent(d.preferredSpendPercent.toString());
      setHardMaxSpendPercent(d.hardMaxSpendPercent.toString());
      return;
    }
    const detected = detectTier(size);
    setTier(detected);
    const d = TIER_DEFAULTS[detected];
    setRiskPercent(d.riskPercent.toString());
    setPreferredSpendPercent(d.preferredSpendPercent.toString());
    setHardMaxSpendPercent(d.hardMaxSpendPercent.toString());
  }, [accountSize]);

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

  // Guidance values
  const riskBudget = acctSize * (parseFloat(riskPercent) / 100);
  const prefBudget = acctSize * (parseFloat(preferredSpendPercent) / 100);
  const hardBudget = acctSize * (parseFloat(hardMaxSpendPercent) / 100);
  const idealPrem = prefBudget / 100;
  const aggressivePrem = hardBudget / 100;
  const maxStopW = riskBudget / 100;
  const entryVal = parseFloat(entryPremium) || 0;
  const lowestStop = entryVal > 0 ? Math.max(0.01, entryVal - maxStopW) : 0;

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

  return (
    <div
      className="w-full max-w-[1400px] mx-auto rounded-2xl p-4 md:p-6 space-y-4"
      style={{
        background: "hsl(220 15% 7%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 24px 48px hsl(0 0% 0% / 0.5)",
      }}
    >
      {/* Header */}
      <div className="text-center space-y-0.5 pt-1">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          <span className="font-black tracking-wide">VAULT</span>{" "}
          <span className="font-light text-muted-foreground">Trade Planner</span>
        </h1>
        <div className="w-24 h-px mx-auto" style={{ background: "hsl(220 10% 25%)" }} />
        <p className="text-[11px] text-muted-foreground/50 pt-1">Long Calls / Long Puts only • Simple Mode</p>
        <p className="text-[11px] text-muted-foreground/40">You enter the setup. VAULT builds the plan.</p>
      </div>

      {/* 3-Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">

        {/* ═══ Account ═══ */}
        <PanelCard title="Account">
          <FieldRow label="Account Size" tooltip="Your total trading account balance." error={errors.accountSize}>
            <FieldInput
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(e.target.value)}
              error={!!errors.accountSize}
              placeholder="$10,000"
            />
          </FieldRow>

          {acctSize > 0 && (
            <div className="rounded-lg px-3 py-2.5 space-y-1.5" style={{ background: inputBg, border: inputBorder }}>
              <p className="text-[9px] font-bold text-primary/80 tracking-widest uppercase">Your Account Plan</p>
              <p className="text-[10px] text-muted-foreground">For a <span className="font-semibold text-foreground">{safeCurrency(acctSize)}</span> account:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                <span className="text-muted-foreground">You can risk</span>
                <span className="text-foreground font-mono font-semibold text-right">{safeCurrency(riskBudget)}</span>
                <span className="text-muted-foreground">Best premium zone</span>
                <span className="text-foreground font-mono font-semibold text-right">~{safeCurrency(idealPrem)}</span>
                <span className="text-muted-foreground">Stretch zone</span>
                <span className="text-foreground font-mono font-semibold text-right">up to {safeCurrency(aggressivePrem)}</span>
              </div>
              <p className="text-[9px] text-muted-foreground/50 italic">Best for: 1-contract setups</p>
            </div>
          )}

          <SegmentedToggle
            options={["Micro", "Small", "Medium", "Large"] as AccountTierLabel[]}
            value={tier}
            onChange={(t) => {
              setTier(t);
              const d = TIER_DEFAULTS[t];
              setRiskPercent(d.riskPercent.toString());
              setPreferredSpendPercent(d.preferredSpendPercent.toString());
              setHardMaxSpendPercent(d.hardMaxSpendPercent.toString());
              setDefaultsLocked(true);
            }}
            disabled={acctSize > 0}
          />

          {/* Custom overrides */}
          {!defaultsLocked && (
            <div className="space-y-2">
              <FieldRow label="% I Can Lose" error={errors.riskPercent}>
                <FieldInput type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} error={!!errors.riskPercent} />
              </FieldRow>
              <FieldRow label="Max % I Can Spend" error={errors.preferredSpendPercent}>
                <FieldInput type="number" step="0.1" value={preferredSpendPercent} onChange={(e) => setPreferredSpendPercent(e.target.value)} error={!!errors.preferredSpendPercent} />
              </FieldRow>
            </div>
          )}

          <button
            onClick={() => setDefaultsLocked(!defaultsLocked)}
            className="inline-flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors"
          >
            {defaultsLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
            {defaultsLocked ? "Unlock Custom" : "Lock Defaults"}
          </button>
        </PanelCard>

        {/* ═══ Trade ═══ */}
        <PanelCard title="Trade">
          <SegmentedToggle
            options={["Long Call", "Long Put"] as TradeDirection[]}
            value={direction}
            onChange={(v) => setDirection(v as TradeDirection)}
          />

          <FieldRow label="Option Buy Price" tooltip="Premium you pay per share (× 100 = contract cost)." error={errors.entryPremium}>
            <FieldInput
              type="number"
              step="0.01"
              value={entryPremium}
              onChange={(e) => setEntryPremium(e.target.value)}
              error={!!errors.entryPremium}
              placeholder="1.20"
            />
          </FieldRow>

          {/* Buy Price guidance */}
          {acctSize > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap -mt-1.5">
              {entryVal > 0 && (
                <span className={`text-[9px] font-semibold ${
                  entryVal <= idealPrem ? "text-green-400" : entryVal <= aggressivePrem ? "text-amber-400" : "text-red-400"
                }`}>
                  {entryVal <= idealPrem ? "✓ Best zone" : entryVal <= aggressivePrem ? "⚠ Stretch zone" : "✗ Too expensive for your account"}
                </span>
              )}
              <GuidanceChip label="Use Ideal" onClick={() => setEntryPremium(idealPrem.toFixed(2))} />
              <GuidanceChip label="Use Max" onClick={() => setEntryPremium(aggressivePrem.toFixed(2))} />
            </div>
          )}

          <FieldRow label="Option Stop Price" tooltip="If the option drops to this price, cut the trade." error={errors.stopPremium}>
            <FieldInput
              type="number"
              step="0.01"
              value={stopPremium}
              onChange={(e) => setStopPremium(e.target.value)}
              error={!!errors.stopPremium}
              placeholder="0.80"
            />
          </FieldRow>

          {/* Stop guidance */}
          {acctSize > 0 && entryVal > 0 ? (
            <p className="text-[9px] text-muted-foreground/50 -mt-1.5">
              For 1 contract — Max risk room: <span className="font-mono font-semibold text-foreground/60">${maxStopW.toFixed(2)}</span>
              {" · "}Suggested stop: <span className="font-mono font-semibold text-foreground/60">${lowestStop.toFixed(2)} or higher</span>
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/40 -mt-1">Cut trade if option hits your stop.</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <Btn primary onClick={handleGenerate} disabled={!isValid}>Generate</Btn>
            <Btn onClick={handleLoadExample}>Load Example</Btn>
            <Btn onClick={handleReset}>Reset</Btn>
            <Btn onClick={handleCopyPlan} disabled={!isValid}>
              <span className="flex items-center gap-1"><Copy className="w-3 h-3" />Copy Trade Plan</span>
            </Btn>
          </div>
        </PanelCard>

        {/* ═══ Results ═══ */}
        <PanelCard title="Results">
          {isValid && liveResult ? (
            <div className="space-y-2">
              <VerdictBanner verdict={liveResult.verdict} reason={liveResult.verdictReason} />

              {/* Core metrics */}
              <div className="rounded-lg overflow-hidden" style={{ border: panelBorder }}>
                <ResultRow
                  label="Contracts to Buy"
                  value={`${liveResult.finalContracts}`}
                  large
                  accent
                />
                <ResultRow label="Option Stop Price" value={safeCurrency(parseFloat(stopPremium))} />
                <ResultRow
                  label="Planned Loss If Stop Hits"
                  value={liveResult.finalContracts > 0 ? `-${safeCurrency(liveResult.totalPlannedRisk)}` : "—"}
                />
                <ResultRow label="Money Needed to Enter" value={safeCurrency(liveResult.totalPositionCost)} />
              </div>

              {/* Targets */}
              {liveResult.finalContracts > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ border: panelBorder }}>
                  <ResultRow label="Main Target (1:2)" value={safeCurrency(liveResult.mainTarget)} accent />
                  <ResultRow label="Quick Profit Idea (TP1)" value={safeCurrency(liveResult.tp1Premium)} />
                  <ResultRow label="Bigger Profit Idea (TP2)" value={safeCurrency(liveResult.tp2Premium)} />
                </div>
              )}

              {/* Status checks */}
              <div className="flex items-center justify-center gap-6 pt-1">
                <StatusCheck label="Risk Check" pass={liveResult.riskCheckPass} />
                <StatusCheck label="Debit Check" pass={liveResult.hardSpendCheckPass} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-xs text-muted-foreground/40 text-center leading-relaxed">
                Enter account size, buy price, and stop price.<br />Results appear here.
              </p>
            </div>
          )}
        </PanelCard>
      </div>

      {/* Footer */}
      <div className="text-center space-y-1 pb-2">
        <p className="text-[10px] text-muted-foreground/50 font-semibold">
          Contract size is based on both your risk limit and spend cap.
        </p>
        <p className="text-[10px] text-muted-foreground/30 italic">
          Cut at your stop. Planned loss is not a guarantee.
        </p>
      </div>
    </div>
  );
}
