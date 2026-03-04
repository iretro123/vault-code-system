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
import { XPWindow } from "./XPWindow";
import { XPButton } from "./XPButton";
import { XPInput } from "./XPInput";
import { XPFieldset } from "./XPFieldset";
import { XPStatusBadge } from "./XPStatusBadge";
import { TradePlannerLoading } from "./TradePlannerLoading";
import { TradePlannerResults } from "./TradePlannerResults";
import { xp } from "./xp-styles";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Lock, Unlock } from "lucide-react";

type UIState = "input" | "loading" | "results";

const STORAGE_KEY = "vault_trade_planner_inputs";

const DEBIT_CAP_TOOLTIP_TITLE = 'What is "Max % I Can Spend"?';
const DEBIT_CAP_TOOLTIP_BODY = `This is your entry spending cap — not your stop loss.

It tells the tool:
"Don't let me spend more than this much of my account to enter one trade."

Why this matters:
An option can have a small planned loss (based on your stop), but still cost a lot to buy.

Example (Small account):
  Account Size = $2,000
  Max % I Can Spend = 5%
  Spending cap = $100

If the option buy price is:
  $0.80 → costs $80 per contract ✅ (allowed)
  $1.50 → costs $150 per contract ❌ (too expensive)

Reminder:
You must pass BOTH checks:
  ✓ Loss Check (risk to stop)
  ✓ Spend Check (money needed to enter)`;

function loadSaved(): Partial<PlannerInputs> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Safe currency display — returns placeholder if value is invalid */
function safeCurrency(n: number | undefined | null): string {
  if (n == null || !isFinite(n) || isNaN(n)) return "—";
  return formatCurrency(n);
}

function LivePreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold text-foreground">{value}</span>
    </div>
  );
}

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
  const [showMore, setShowMore] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dte, setDte] = useState(saved.dte?.toString() ?? "");
  const [delta, setDelta] = useState(saved.delta?.toString() ?? "");
  const [strike, setStrike] = useState(saved.strike?.toString() ?? "");
  const [chartStop, setChartStop] = useState(saved.chartStopLevel?.toString() ?? "");
  const [underlyingEntry, setUnderlyingEntry] = useState(saved.underlyingEntry?.toString() ?? "");

  // Simple Mode: lock risk/debit defaults
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
    dte: dte ? parseFloat(dte) : undefined,
    delta: delta ? parseFloat(delta) : undefined,
    strike: strike ? parseFloat(strike) : undefined,
    chartStopLevel: chartStop ? parseFloat(chartStop) : undefined,
    underlyingEntry: underlyingEntry ? parseFloat(underlyingEntry) : undefined,
  }), [accountSize, riskPercent, debitCapPercent, direction, entryPremium, stopPremium, tp1, tp2, dte, delta, strike, chartStop, underlyingEntry]);

  // Live result — only valid when all required fields pass validation
  const liveResult: PlannerResult | null = (() => {
    const inputs = buildInputs();
    const errs = validateInputs(inputs);
    if (errs.length > 0) return null;
    const r = calculatePlan(inputs);
    if (!isFinite(r.finalContracts) || isNaN(r.totalPlannedRisk)) return null;
    return r;
  })();

  const isValid = liveResult !== null;

  // Live helper: max entry spend
  const liveMaxSpend = (() => {
    const acct = parseFloat(accountSize) || 0;
    const cap = parseFloat(debitCapPercent) || 0;
    if (acct > 0 && cap > 0) return acct * (cap / 100);
    return null;
  })();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildInputs()));
    } catch {}
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
    handleTierChange("Small");
    setAccountSize("2000");
    setDirection("Long Call");
    setEntryPremium("0.80");
    setStopPremium("0.40");
    setDte("30");
    setDelta("0.40");
    setStrike("");
    setChartStop("");
    setUnderlyingEntry("");
    setErrors({});
    toast.success("Example loaded — click Generate to see results");
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

  return (
    <XPWindow
      title="Vault Trade Planner.exe"
      menuBar
      fitViewport
      footer="Vault Academy Toolkit • Daily-use pre-trade planner"
    >
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-foreground">Vault Trade Planner</h2>
        <p className="text-[11px] text-muted-foreground">Long Calls / Long Puts only • Simple Mode</p>
      </div>

      {/* Vault handles the math — reassuring banner (hidden on mobile) */}
      <div
        className="hidden md:block rounded-[3px] px-3 py-2 text-[11px] text-center"
        style={{ background: xp.heroBg, border: xp.heroBorder }}
      >
        <p className="font-semibold text-foreground">You enter the setup. VAULT builds the plan.</p>
        <p className="text-muted-foreground mt-0.5">No guessing. No oversizing. No random targets.</p>
      </div>

      {/* Rule banner (hidden on mobile) */}
      <div
        className="hidden md:block rounded-[3px] px-3 py-2 text-[11px] font-medium"
        style={{ background: xp.warningBg, border: xp.warningBorder, color: xp.warningText }}
      >
        Risk to stop is NOT the same as money needed to enter. Pass BOTH checks.
      </div>

      {/* How to use — collapsible (hidden on mobile) */}
      <div className="hidden md:block">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary/80 hover:text-primary w-full text-left"
        >
          {showHelp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          How to use (20 sec)
        </button>
        {showHelp && (
          <div
            className="rounded-[3px] px-3 py-2 text-[11px] text-muted-foreground space-y-0.5 mt-2"
            style={{ background: xp.heroBg, border: xp.heroBorder }}
          >
            <p>1. Enter account size</p>
            <p>2. Enter option buy price and option stop price</p>
            <p>3. Click <strong className="text-foreground">Generate</strong></p>
            <p>4. Follow the plan (contracts, cut loss, target)</p>
            <p className="text-primary/70 pt-1">VAULT auto-sets risk %, spending cap, and targets for you.</p>
          </div>
        )}
      </div>

      {/* Section 1: Account */}
      <XPFieldset legend="1) Account">
        <div className="flex gap-1.5">
          {(["Small", "Medium", "Large"] as AccountTierLabel[]).map((t) => (
            <XPButton key={t} active={tier === t} onClick={() => handleTierChange(t)}>{t}</XPButton>
          ))}
        </div>

        <XPInput label="Account Size" type="number" value={accountSize} onChange={(e) => setAccountSize(e.target.value)} error={errors.accountSize} placeholder="2000" />

        {/* Risk + Debit Cap — locked by default in Simple Mode */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {defaultsLocked
                ? "We set these for you in Simple Mode."
                : "Custom values — change at your own risk."}
            </p>
            <button
              type="button"
              onClick={() => setDefaultsLocked(!defaultsLocked)}
              className="inline-flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary"
            >
              {defaultsLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {defaultsLocked ? "Unlock" : "Lock"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <XPInput
              label="% I Can Lose"
              type="number" step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              error={errors.riskPercent}
              tooltip="Percent of your account you are willing to lose on this trade."
              disabled={defaultsLocked}
              style={defaultsLocked ? { opacity: 0.6 } : undefined}
            />
            <div>
              <XPInput
                label="Max % I Can Spend"
                type="number" step="0.1"
                value={debitCapPercent}
                onChange={(e) => setDebitCapPercent(e.target.value)}
                error={errors.debitCapPercent}
                tooltipWhite
                tooltipTitle={DEBIT_CAP_TOOLTIP_TITLE}
                tooltip={DEBIT_CAP_TOOLTIP_BODY}
                disabled={defaultsLocked}
                style={defaultsLocked ? { opacity: 0.6 } : undefined}
              />
              {liveMaxSpend !== null && (
                <p className="text-[10px] text-primary/70 mt-0.5 font-mono">
                  Max entry spend = {formatCurrency(liveMaxSpend)}
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="hidden md:block text-[10px] text-muted-foreground">
          Small: 2% risk • 5% spend cap | Medium: 1% risk • 5% spend cap | Large: 1% risk • 4% spend cap
        </p>
      </XPFieldset>

      {/* Section 2: Trade */}
      <XPFieldset legend="2) Trade">
        <div className="flex gap-1.5">
          {(["Long Call", "Long Put"] as TradeDirection[]).map((d) => (
            <XPButton key={d} active={direction === d} onClick={() => setDirection(d)}>{d}</XPButton>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <XPInput label="Option Buy Price" type="number" step="0.01" value={entryPremium} onChange={(e) => setEntryPremium(e.target.value)} error={errors.entryPremium} placeholder="0.80" />
          <XPInput
            label="Option Stop Price"
            type="number" step="0.01" value={stopPremium} onChange={(e) => setStopPremium(e.target.value)} error={errors.stopPremium} placeholder="0.40"
            tooltip="If option price hits this, cut the trade."
          />
        </div>
        <p className="hidden md:block text-[10px] text-muted-foreground">If option price hits your stop, cut the trade.</p>
        <p className="hidden md:block text-[10px] text-primary/70 font-medium">Simple Mode uses a 1:2 main target. VAULT auto-calculates your target + profit suggestions.</p>

        <button
          onClick={() => setShowMore(!showMore)}
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          {showMore ? "Show Less" : "Show More..."}
        </button>

        {showMore && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            <XPInput label="Days Left" type="number" value={dte} onChange={(e) => setDte(e.target.value)} placeholder="30" tooltip="How many days until the option expires." />
            <XPInput label="Option Speed" type="number" step="0.01" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="0.40" tooltip="How fast the option may move when the stock moves." />
            <XPInput label="Strike" type="number" step="0.5" value={strike} onChange={(e) => setStrike(e.target.value)} />
            <XPInput label="Chart Stop Level" type="number" step="0.01" value={chartStop} onChange={(e) => setChartStop(e.target.value)} />
            <XPInput label="Underlying Entry" type="number" step="0.01" value={underlyingEntry} onChange={(e) => setUnderlyingEntry(e.target.value)} />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">Optional: Days Left • Option Speed • Strike • Chart stop level</p>
      </XPFieldset>

      {/* Section 3: Generate */}
      <XPFieldset legend="3) Generate">
        {/* Live preview / empty state */}
        <div
          className="rounded-[3px] p-3 space-y-1"
          style={{ background: xp.heroBg, border: xp.heroBorder }}
        >
          {isValid && liveResult ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-1">Live Preview</p>
              <LivePreviewRow label="How Many Contracts" value={`${liveResult.finalContracts}`} />
              <LivePreviewRow label="Option Stop Price" value={safeCurrency(buildInputs().stopPremium)} />
              <LivePreviewRow label="Planned Loss If Stop Hits" value={safeCurrency(liveResult.totalPlannedRisk)} />
              <LivePreviewRow label="Money Needed to Enter" value={safeCurrency(liveResult.totalPositionCost)} />
              <LivePreviewRow label="Main Target (1:2)" value={safeCurrency(liveResult.rr1to2Target)} />
              <LivePreviewRow label="Quick Profit Idea (TP1)" value={safeCurrency(liveResult.tp1Premium)} />
              <LivePreviewRow label="Bigger Profit Idea (TP2)" value={safeCurrency(liveResult.tp2Premium)} />
              {/* What To Do inline summary */}
              <div className="pt-2 mt-2 space-y-0.5 text-[11px] text-foreground" style={{ borderTop: "1px solid hsl(213 18% 22%)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-1">What To Do</p>
                <p>• Buy <strong>{liveResult.finalContracts}</strong> {direction} at <strong>{safeCurrency(buildInputs().entryPremium)}</strong></p>
                <p>• Cut the trade if the option hits <strong>{safeCurrency(buildInputs().stopPremium)}</strong></p>
                <p>• Money needed: <strong>{safeCurrency(liveResult.totalPositionCost)}</strong></p>
                <p>• Planned loss if stop hits: <strong>{safeCurrency(liveResult.totalPlannedRisk)}</strong></p>
                <p>• Main target (1:2): <strong>{safeCurrency(liveResult.rr1to2Target)}</strong></p>
              </div>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Preview</p>
              <LivePreviewRow label="How Many Contracts" value="—" />
              <LivePreviewRow label="Option Stop Price" value="—" />
              <LivePreviewRow label="Planned Loss If Stop Hits" value="—" />
              <LivePreviewRow label="Money Needed to Enter" value="—" />
              <LivePreviewRow label="Main Target (1:2)" value="—" />
              <LivePreviewRow label="Quick Profit Idea (TP1)" value="—" />
              <LivePreviewRow label="Bigger Profit Idea (TP2)" value="—" />
              <p className="text-[10px] text-muted-foreground/50 pt-2">
                Enter your account + option buy price + option stop price. VAULT will build your trade plan.
              </p>
            </>
          )}
        </div>

        {/* Reassuring sub-copy */}
        <p className="text-[10px] text-primary/60 font-medium text-center">
          Don't stress — VAULT calculates your size, loss, and target.
        </p>

        <div className="flex flex-wrap gap-2">
          <XPButton variant="primary" onClick={handleGenerate} disabled={!isValid}>Generate</XPButton>
          <XPButton onClick={handleLoadExample}>Load Example</XPButton>
          <XPButton onClick={handleReset}>Reset</XPButton>
          <XPButton onClick={handleCopyPlan} disabled={!isValid}>Copy Trade Plan</XPButton>
        </div>

        <div className="flex gap-1.5">
          <XPStatusBadge label="Risk Check" pass={liveResult?.riskCheckPass ?? false} />
          <XPStatusBadge label="Debit Check" pass={liveResult?.debitCheckPass ?? false} />
        </div>

        <p className="text-[10px] text-muted-foreground/70">
          ⚠ Cut at your stop. Planned loss is not a guarantee.
        </p>
        <p className="text-[10px] text-muted-foreground/50">
          How many contracts? = based on BOTH your risk limit and your spend cap.<br />
          This keeps students from oversizing and blowing up trades.
        </p>
      </XPFieldset>
    </XPWindow>
  );
}
