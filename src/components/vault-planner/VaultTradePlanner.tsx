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
} from "@/lib/tradePlannerCalc";
import { XPWindow } from "./XPWindow";
import { XPButton } from "./XPButton";
import { XPInput } from "./XPInput";
import { XPFieldset } from "./XPFieldset";
import { XPStatusBadge } from "./XPStatusBadge";
import { XPTooltip } from "./XPTooltip";
import { TradePlannerLoading } from "./TradePlannerLoading";
import { TradePlannerResults } from "./TradePlannerResults";
import { xp } from "./xp-styles";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";

type UIState = "input" | "loading" | "results";

const STORAGE_KEY = "vault_trade_planner_inputs";

function loadSaved(): Partial<PlannerInputs> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function VaultTradePlanner() {
  const saved = loadSaved();

  const [tier, setTier] = useState<AccountTierLabel>("Small");
  const [accountSize, setAccountSize] = useState(saved.accountSize?.toString() ?? "2000");
  const [riskPercent, setRiskPercent] = useState(saved.riskPercent?.toString() ?? "2");
  const [debitCapPercent, setDebitCapPercent] = useState(saved.debitCapPercent?.toString() ?? "5");
  const [direction, setDirection] = useState<TradeDirection>(saved.direction ?? "Long Call");
  const [entryPremium, setEntryPremium] = useState(saved.entryPremium?.toString() ?? "0.80");
  const [stopPremium, setStopPremium] = useState(saved.stopPremium?.toString() ?? "0.40");
  const [tp1, setTp1] = useState(saved.tp1Percent?.toString() ?? "30");
  const [tp2, setTp2] = useState(saved.tp2Percent?.toString() ?? "50");
  const [showMore, setShowMore] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dte, setDte] = useState(saved.dte?.toString() ?? "");
  const [delta, setDelta] = useState(saved.delta?.toString() ?? "");
  const [strike, setStrike] = useState(saved.strike?.toString() ?? "");
  const [chartStop, setChartStop] = useState(saved.chartStopLevel?.toString() ?? "");
  const [underlyingEntry, setUnderlyingEntry] = useState(saved.underlyingEntry?.toString() ?? "");

  const [uiState, setUIState] = useState<UIState>("input");
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTierChange = (t: AccountTierLabel) => {
    setTier(t);
    const d = TIER_DEFAULTS[t];
    setRiskPercent(d.riskPercent.toString());
    setDebitCapPercent(d.debitCapPercent.toString());
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

  const liveResult = (() => {
    const inputs = buildInputs();
    const errs = validateInputs(inputs);
    if (errs.length > 0) return null;
    return calculatePlan(inputs);
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
    setAccountSize("2000");
    setDirection("Long Call");
    setEntryPremium("0.80");
    setStopPremium("0.40");
    setTp1("30");
    setTp2("50");
    setDte("");
    setDelta("");
    setStrike("");
    setChartStop("");
    setUnderlyingEntry("");
    setErrors({});
    setResult(null);
    setUIState("input");
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
      footer="Vault Academy Toolkit • Daily-use pre-trade planner"
    >
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-foreground">Vault Trade Planner</h2>
        <p className="text-[11px] text-muted-foreground">Long Calls / Long Puts only • Super Easy Mode</p>
      </div>

      {/* Rule banner */}
      <div
        className="rounded-[3px] px-3 py-2 text-[11px] font-medium"
        style={{ background: xp.warningBg, border: xp.warningBorder, color: xp.warningText }}
      >
        Risk to stop is NOT the same as money needed to enter. Pass BOTH checks.
      </div>

      {/* How to use — collapsible */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-primary/80 hover:text-primary w-full text-left"
      >
        {showHelp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        How to use (20 sec)
      </button>
      {showHelp && (
        <div
          className="rounded-[3px] px-3 py-2 text-[11px] text-muted-foreground space-y-0.5"
          style={{ background: xp.heroBg, border: xp.heroBorder }}
        >
          <p>1. Enter account size and risk settings</p>
          <p>2. Enter option buy price and option stop price</p>
          <p>3. Click <strong className="text-foreground">Generate</strong></p>
          <p>4. Follow the plan (contracts, cut loss, target)</p>
        </div>
      )}

      {/* Section 1: Account */}
      <XPFieldset legend="1) Account">
        <div className="flex gap-1.5">
          {(["Small", "Medium", "Large"] as AccountTierLabel[]).map((t) => (
            <XPButton key={t} active={tier === t} onClick={() => handleTierChange(t)}>{t}</XPButton>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <XPInput label="Account Size" type="number" value={accountSize} onChange={(e) => setAccountSize(e.target.value)} error={errors.accountSize} placeholder="$2,000" />
          <XPInput
            label="% I Can Lose"
            type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} error={errors.riskPercent}
            tooltip="Percent of your account you are willing to lose on this trade."
          />
          <XPInput
            label="Max % I Can Spend"
            type="number" step="0.1" value={debitCapPercent} onChange={(e) => setDebitCapPercent(e.target.value)} error={errors.debitCapPercent}
            tooltip="Max percent of account you allow yourself to spend to enter."
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Small: 1–2% risk • 5% spend cap | Medium: 1% risk • 5% spend cap | Large: 0.5–1% risk • 3–5% spend
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
          <XPInput label="Option Buy Price" type="number" step="0.01" value={entryPremium} onChange={(e) => setEntryPremium(e.target.value)} error={errors.entryPremium} placeholder="$0.80" />
          <XPInput
            label="Option Stop Price"
            type="number" step="0.01" value={stopPremium} onChange={(e) => setStopPremium(e.target.value)} error={errors.stopPremium} placeholder="$0.40"
            tooltip="If the option drops to this price, cut the trade."
          />
        </div>
        <p className="text-[10px] text-muted-foreground">This is your stop loss on the option.</p>
        <div className="grid grid-cols-3 gap-2">
          <XPInput
            label="Target Style"
            value="1:2"
            readOnly
            style={{ opacity: 0.7 }}
            tooltip="1:2 means if you risk $1, aim to make $2."
          />
          <XPInput label="Take Profit 1 %" type="number" value={tp1} onChange={(e) => setTp1(e.target.value)} />
          <XPInput label="Take Profit 2 %" type="number" value={tp2} onChange={(e) => setTp2(e.target.value)} />
        </div>

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
        <p className="text-[11px] text-muted-foreground">Click Generate to create your trade plan</p>
        <div className="flex flex-wrap gap-2">
          <XPButton variant="primary" onClick={handleGenerate}>Generate</XPButton>
          <XPButton onClick={handleReset}>Reset</XPButton>
          <XPButton onClick={handleCopyPlan}>Copy Trade Plan</XPButton>
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
