import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Outcome = "WIN" | "LOSS" | "BREAKEVEN";
type InstrumentType = "options" | "futures";

const outcomeMessages: Record<Outcome, { title: string; message: string }> = {
  WIN: {
    title: "Protect the edge",
    message: "No sizing up. 2 minutes reset.",
  },
  LOSS: {
    title: "Cooldown mindset",
    message: "No immediate re-entry. Review plan.",
  },
  BREAKEVEN: {
    title: "Neutral outcome",
    message: "Assess setup quality. Stay patient.",
  },
};

interface TradeLoggerCardProps {
  variant?: "card" | "embedded";
}

export function TradeLoggerCard({ variant = "card" }: TradeLoggerCardProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Outcome | null>(null);
  const symbolInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!success) {
      symbolInputRef.current?.focus();
    }
  }, [success]);

  // Form state — no emotional state, no followed_rules
  const [instrumentType, setInstrumentType] = useState<InstrumentType>("options");
  const [symbol, setSymbol] = useState("");
  const [riskAmount, setRiskAmount] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("WIN");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setSymbol("");
    setRiskAmount("");
    setOutcome("WIN");
    setNotes("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Not authenticated");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const riskReward = outcome === "WIN" ? 1 : outcome === "LOSS" ? -1 : 0;

    const { error: insertError } = await supabase.from("trade_entries").insert({
      user_id: user.id,
      symbol: symbol.trim().toUpperCase(),
      instrument_type: instrumentType,
      outcome: outcome,
      risk_used: parseFloat(riskAmount) || 0,
      risk_reward: riskReward,
      emotional_state: 3, // Default neutral
      followed_rules: true, // Default true
      notes: notes.trim() || null,
    });

    setSubmitting(false);

    if (insertError) {
      const msg = insertError.message || "Trade blocked";
      const vaultMatch = msg.match(/Trade blocked by Vault:\s*(.+)/);
      setError(vaultMatch ? vaultMatch[1] : msg);
      return;
    }

    setSuccess(outcome);
    resetForm();
    setTimeout(() => setSuccess(null), 5000);
  };

  const successContent = success ? (
    <>
      <p className="text-sm font-medium text-foreground">
        Logged. Vault updated.
      </p>
      
      <div
        className={`p-3 rounded-xl ${
          success === "WIN"
            ? "bg-accent/10 border border-accent/20"
            : success === "LOSS"
            ? "bg-destructive/10 border border-destructive/20"
            : "bg-muted/30 border border-border"
        }`}
      >
        <p
          className={`text-sm font-medium ${
            success === "WIN"
              ? "text-accent"
              : success === "LOSS"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {outcomeMessages[success].title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{outcomeMessages[success].message}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setSuccess(null)}
      >
        Log Another
      </Button>
    </>
  ) : null;

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Row 1: Instrument + Symbol */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select
            value={instrumentType}
            onValueChange={(v) => setInstrumentType(v as InstrumentType)}
          >
            <SelectTrigger className="h-9 text-sm bg-muted/30 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="options">Options</SelectItem>
              <SelectItem value="futures">Futures</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Symbol</Label>
          <Input
            ref={symbolInputRef}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="SPY, ES…"
            className="vault-input h-9 text-sm"
            required
          />
        </div>
      </div>

      {/* Row 2: Risk + Outcome */}
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
          <Select
            value={outcome}
            onValueChange={(v) => setOutcome(v as Outcome)}
          >
            <SelectTrigger className="h-9 text-sm bg-muted/30 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WIN">Win</SelectItem>
              <SelectItem value="LOSS">Loss</SelectItem>
              <SelectItem value="BREAKEVEN">Breakeven</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Optional Note */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          Note (optional)
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Quick reflection…"
          className="vault-input h-14 text-sm resize-none"
          maxLength={500}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="sm"
        disabled={submitting || !symbol.trim() || !riskAmount}
        className="vault-cta w-full h-10"
      >
        {submitting ? "Logging…" : "Log Trade"}
      </Button>
    </form>
  );

  if (variant === "embedded") {
    return (
      <div className="space-y-3">
        {success ? successContent : formContent}
      </div>
    );
  }

  if (success) {
    return (
      <Card className="vault-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Trade Logged
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {successContent}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="vault-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Log Trade
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {formContent}
      </CardContent>
    </Card>
  );
}
