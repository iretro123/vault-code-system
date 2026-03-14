import { useState, useMemo, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ImagePlus, X, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DIRECTION_OPTIONS = ["Calls", "Puts"] as const;
const RESULT_OPTIONS = ["Win", "Loss", "Breakeven"] as const;
const TARGET_OPTIONS = ["Yes", "Partial", "No"] as const;
const YES_NO = ["Yes", "No"] as const;
const SETUP_OPTIONS = ["Breakout", "Supply/Demand", "Trend Follow", "Scalp", "Other"];

export interface TradeFormData {
  symbol: string;
  direction: string;
  date: Date;
  entryPrice: string;
  exitPrice: string;
  positionSize: string;
  resultType: string;
  pnl: string;
  targetHit: string;
  stopRespected: string;
  planFollowed: string;
  oversized: string;
  setupUsed: string;
  note: string;
  screenshotFile?: File;
}

interface PlanPrefill {
  symbol?: string;
  direction?: string;
  entryPrice?: string;
  positionSize?: string;
  stopPrice?: string;
}

interface LogTradeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TradeFormData) => Promise<void>;
  planId?: string;
  prefill?: PlanPrefill;
}

function SegmentedToggle({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors duration-100",
            value === opt
              ? "bg-primary text-primary-foreground"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function LogTradeSheet({ open, onOpenChange, onSubmit, planId, prefill }: LogTradeSheetProps) {
  const [quickMode, setQuickMode] = useState(true);
  const lastTicker = useMemo(() => { try { return localStorage.getItem("va_last_ticker") || ""; } catch { return ""; } }, []);
  const [symbol, setSymbol] = useState(prefill?.symbol || lastTicker);
  const [direction, setDirection] = useState<string>(prefill?.direction || "Calls");
  const [date, setDate] = useState<Date>(new Date());
  const [entryPrice, setEntryPrice] = useState(prefill?.entryPrice || "");
  const [exitPrice, setExitPrice] = useState("");
  const [positionSize, setPositionSize] = useState(prefill?.positionSize || "");
  const [resultType, setResultType] = useState<string>("Win");
  const [pnlOverride, setPnlOverride] = useState("");
  const [targetHit, setTargetHit] = useState("Yes");
  const [stopRespected, setStopRespected] = useState("Yes");
  const [planFollowed, setPlanFollowed] = useState("Yes");
  const [oversized, setOversized] = useState("No");
  const [setupUsed, setSetupUsed] = useState("");
  const [note, setNote] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate preview URL when file changes
  useEffect(() => {
    if (!screenshotFile) { setScreenshotPreview(null); return; }
    const url = URL.createObjectURL(screenshotFile);
    setScreenshotPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshotFile]);

  // Re-apply prefill when it changes
  useEffect(() => {
    if (prefill) {
      if (prefill.symbol) setSymbol(prefill.symbol);
      if (prefill.direction) setDirection(prefill.direction);
      if (prefill.entryPrice) setEntryPrice(prefill.entryPrice);
      if (prefill.positionSize) setPositionSize(prefill.positionSize);
    }
  }, [prefill]);

  const calculatedPnl = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const size = parseFloat(positionSize);
    if (!isNaN(entry) && !isNaN(exit) && !isNaN(size) && entry > 0) {
      const raw = (exit - entry) * size * 100;
      return raw.toFixed(2);
    }
    return "";
  }, [entryPrice, exitPrice, positionSize]);

  const pnlValue = pnlOverride || calculatedPnl;

  // Auto-set result type from P/L sign
  useEffect(() => {
    const pnl = parseFloat(pnlValue);
    if (isNaN(pnl) || pnl === 0) return;
    if (pnl > 0 && resultType !== "Win") setResultType("Win");
    else if (pnl < 0 && resultType !== "Loss") setResultType("Loss");
  }, [pnlValue]);

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate P/L vs result type
  useEffect(() => {
    const pnl = parseFloat(pnlValue);
    if (!pnlValue || pnlValue === "") {
      setValidationError(null);
      return;
    }
    if (isNaN(pnl)) {
      setValidationError("P/L must be a valid number.");
      return;
    }
    if (resultType === "Win" && pnl <= 0) {
      setValidationError("Win trades must have a positive P/L.");
      return;
    }
    if (resultType === "Loss" && pnl >= 0) {
      setValidationError("Loss trades must have a negative P/L.");
      return;
    }
    setValidationError(null);
  }, [pnlValue, resultType]);

  const isFormValid = useMemo(() => {
    if (!symbol.trim()) return false;
    const pnl = parseFloat(pnlValue);
    if (!pnlValue || isNaN(pnl)) return false;
    if (resultType === "Win" && pnl <= 0) return false;
    if (resultType === "Loss" && pnl >= 0) return false;
    if (validationError) return false;
    return true;
  }, [symbol, pnlValue, resultType, validationError]);

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        symbol: symbol.toUpperCase(),
        direction,
        date,
        entryPrice,
        exitPrice,
        positionSize,
        resultType,
        pnl: pnlValue,
        targetHit,
        stopRespected,
        planFollowed,
        oversized,
        setupUsed,
        note,
        screenshotFile: screenshotFile || undefined,
      });
      // Remember last ticker
      try { localStorage.setItem("va_last_ticker", symbol.toUpperCase()); } catch {}
      // Reset on success
      setSymbol("");
      setDirection("Calls");
      setDate(new Date());
      setEntryPrice("");
      setExitPrice("");
      setPositionSize("");
      setResultType("Win");
      setPnlOverride("");
      setTargetHit("Yes");
      setStopRespected("Yes");
      setPlanFollowed("Yes");
      setOversized("No");
      setSetupUsed("");
      setNote("");
      setScreenshotFile(null);
      setQuickMode(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-background border-border">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-foreground">{quickMode ? "Quick Log" : "Log Trade"}</SheetTitle>
            <button
              type="button"
              onClick={() => setQuickMode(!quickMode)}
              className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {quickMode ? "Full Mode" : "Quick Mode"}
            </button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 py-5">
            {/* ── QUICK MODE: 5 essential fields ── */}

            {/* Symbol — always shown */}
            <Field label="Symbol">
              <Input
                placeholder="SPY, TSLA, NVDA…"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="uppercase"
              />
            </Field>

            {/* Direction — always shown */}
            <Field label="Direction">
              <SegmentedToggle options={DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
            </Field>

            {/* Result — always shown */}
            <Field label="Result">
              <SegmentedToggle options={RESULT_OPTIONS} value={resultType} onChange={setResultType} />
            </Field>

            {/* P/L — always shown */}
            <Field label="P/L ($)">
              <Input
                type="number"
                placeholder={calculatedPnl ? `Auto: $${calculatedPnl}` : "$0.00"}
                value={pnlOverride}
                onChange={(e) => setPnlOverride(e.target.value)}
                className={cn(validationError && "border-destructive")}
              />
              {validationError && (
                <p className="text-[10px] text-destructive mt-1">{validationError}</p>
              )}
              {!validationError && calculatedPnl && !pnlOverride && (
                <p className="text-[10px] text-muted-foreground mt-1">Auto-calculated from (exit − entry) × contracts × 100</p>
              )}
              {!validationError && !pnlValue && (
                <p className="text-[10px] text-muted-foreground/60 mt-1">Required — enter your actual dollar P/L for this trade.</p>
              )}
            </Field>

            {/* Rules Followed — always shown */}
            <Field label="Did you follow your plan?">
              <SegmentedToggle options={YES_NO} value={planFollowed} onChange={setPlanFollowed} />
            </Field>

            {/* ── ADD DETAILS (expand to full mode) ── */}
            {quickMode && (
              <Button
                type="button"
                variant="ghost"
                className="w-full h-9 text-xs text-muted-foreground gap-1.5"
                onClick={() => setQuickMode(false)}
              >
                <ChevronDown className="h-3.5 w-3.5" /> Add Details
              </Button>
            )}

            {/* ── FULL MODE: additional fields ── */}
            {!quickMode && (
              <>
                {/* Date */}
                <Field label="Date / Time">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP p") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </Field>

                {/* Price row */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Entry Price">
                    <Input type="number" placeholder="0.00" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
                  </Field>
                  <Field label="Exit Price">
                    <Input type="number" placeholder="0.00" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
                  </Field>
                </div>

                {/* Position Size */}
                <Field label="Position Size">
                  <Input type="number" placeholder="Contracts" value={positionSize} onChange={(e) => setPositionSize(e.target.value)} />
                </Field>

                {/* Accountability */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-foreground tracking-wide uppercase">Accountability</p>
                  <Field label="Did you hit your target?">
                    <SegmentedToggle options={TARGET_OPTIONS} value={targetHit} onChange={setTargetHit} />
                  </Field>
                  <Field label="Did you respect your stop?">
                    <SegmentedToggle options={YES_NO} value={stopRespected} onChange={setStopRespected} />
                  </Field>
                  <Field label="Did you oversize this trade?">
                    <SegmentedToggle options={YES_NO} value={oversized} onChange={setOversized} />
                  </Field>
                </div>

                {/* Setup Used */}
                <Field label="Setup Used">
                  <Select value={setupUsed} onValueChange={setSetupUsed}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select setup…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SETUP_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Screenshot upload */}
                <Field label="Screenshot (optional)">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 15 * 1024 * 1024) return;
                        setScreenshotFile(f);
                      }
                      e.target.value = "";
                    }}
                  />
                  {screenshotPreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <img src={screenshotPreview} alt="Screenshot preview" className="w-full max-h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => setScreenshotFile(null)}
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-background/70 backdrop-blur-sm px-2 py-1">
                        <p className="text-[10px] text-muted-foreground truncate">{screenshotFile?.name}</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-20 rounded-lg border border-dashed border-border flex items-center justify-center gap-2 text-xs text-muted-foreground hover:border-primary/40 transition-colors duration-100"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Tap to attach screenshot
                    </button>
                  )}
                </Field>

                {/* Quick Note */}
                <Field label="Quick Note (optional)">
                  <Textarea
                    placeholder="Trade rationale, observations…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                  />
                </Field>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
          <Button className="flex-1" onClick={handleSubmit} disabled={!isFormValid || submitting}>
            {submitting ? "Saving…" : "Save Trade & Generate Review"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}