import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TradingStyle = "intraday" | "multi_day";

interface V1OnboardingProps {
  onComplete: () => void;
}

export function V1Onboarding({ onComplete }: V1OnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [balance, setBalance] = useState("");
  const [style, setStyle] = useState<TradingStyle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const balanceNum = parseFloat(balance);
  const balanceValid = !isNaN(balanceNum) && balanceNum > 0;

  const handleSubmit = async () => {
    if (!balanceValid || !style || !user) return;
    setSubmitting(true);
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc("complete_onboarding", {
        _user_id: user.id,
        _balance: balanceNum,
        _market_type: "options",
        _default_style: style,
      });

      if (rpcError) {
        setError(rpcError.message);
        setSubmitting(false);
        return;
      }

      onComplete();
    } catch {
      setError("Unexpected error. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="vault-card w-full max-w-md p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Set Up Vault OS</h2>
            <p className="text-xs text-muted-foreground">
              {step === 0 ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
          </div>
        </div>

        {/* Step 1: Balance */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                Account Balance ($)
              </label>
              <Input
                type="number"
                min={1}
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="e.g. 25000"
                className="font-mono text-lg h-12"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-2">
                Used to calculate daily risk limits. Options only for V1.
              </p>
            </div>

            <Button
              disabled={!balanceValid}
              onClick={() => setStep(1)}
              className="vault-cta w-full h-12 text-base font-semibold uppercase tracking-wide rounded-xl"
              size="lg"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Trading Style */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                How do you usually trade?
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStyle("intraday")}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border transition-all duration-150",
                    style === "intraday"
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
                  )}
                >
                  <span className="text-sm font-semibold">Intraday</span>
                  <span className="block text-[11px] opacity-70 mt-0.5">
                    Open and close trades within the same session.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStyle("multi_day")}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border transition-all duration-150",
                    style === "multi_day"
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
                  )}
                >
                  <span className="text-sm font-semibold">Multi-day</span>
                  <span className="block text-[11px] opacity-70 mt-0.5">
                    Hold positions across sessions or overnight.
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                This sets initial enforcement bias. Vault adapts automatically over time.
              </p>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(0)}
                className="h-12"
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                disabled={!style || submitting}
                onClick={handleSubmit}
                className="vault-cta flex-1 h-12 text-base font-semibold uppercase tracking-wide rounded-xl"
                size="lg"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Activate Vault"
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
