import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/**
 * DISABLED — This component renders UI but does NOT:
 * - insert into trade_entries
 * - call any RPCs
 * - change vault status
 * Trade logging is handled exclusively through the V1 execution flow
 * (Trade Intent → Vault Authorization → Close Trade).
 */

type Outcome = "WIN" | "LOSS" | "BREAKEVEN";

interface TradeLoggerCardProps {
  variant?: "card" | "embedded";
}

export function TradeLoggerCard({ variant = "card" }: TradeLoggerCardProps) {
  const symbolInputRef = useRef<HTMLInputElement>(null);

  const [symbol, setSymbol] = useState("");
  const [riskAmount, setRiskAmount] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("WIN");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    symbolInputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Trade logging is disabled. Use the execution flow (Buying Now → Close Trade) to log trades.");
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Symbol</Label>
        <Input
          ref={symbolInputRef}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="SPY, QQQ, AAPL…"
          className="vault-input h-9 text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Risk ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={riskAmount}
            onChange={(e) => setRiskAmount(e.target.value)}
            placeholder="100"
            className="vault-input h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Outcome</Label>
          <div className="grid grid-cols-3 gap-1">
            {(["WIN", "LOSS", "BREAKEVEN"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={`h-9 rounded-md text-xs font-semibold transition-all border ${
                  outcome === o
                    ? o === "WIN"
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                      : o === "LOSS"
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-500"
                      : "bg-muted/30 border-border text-foreground"
                    : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
                }`}
              >
                {o === "BREAKEVEN" ? "BE" : o}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Note (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Quick reflection…"
          className="vault-input h-14 text-sm resize-none"
          maxLength={500}
        />
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={!symbol.trim() || !riskAmount}
        className="vault-cta w-full h-10"
      >
        Log Trade
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Disabled — use the execution flow to log trades.
      </p>
    </form>
  );

  if (variant === "embedded") {
    return <div className="space-y-3">{formContent}</div>;
  }

  return (
    <Card className="vault-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Log Trade
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">{formContent}</CardContent>
    </Card>
  );
}
