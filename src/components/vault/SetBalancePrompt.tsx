import React, { useState } from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Loader2 } from "lucide-react";

interface SetBalancePromptProps {
  onComplete: () => void;
}

export function SetBalancePrompt({ onComplete }: SetBalancePromptProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const balanceNum = parseFloat(balance);
  const isValid = !isNaN(balanceNum) && balanceNum > 0;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setSubmitting(true);
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc("set_account_balance", {
        _user_id: user.id,
        _balance: balanceNum,
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
    <Card className="vault-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Set Your Account Balance</h3>
          <p className="text-xs text-muted-foreground">
            Vault OS uses this to calculate your daily risk limits.
          </p>
        </div>
      </div>

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
          disabled={submitting}
        />
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Enter your current live trading account balance. Vault OS uses this to calculate limits.
        </p>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <Button
        disabled={!isValid || submitting}
        onClick={handleSubmit}
        className="vault-cta w-full h-12 text-base font-semibold uppercase tracking-wide rounded-xl"
        size="lg"
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "Activate Vault"
        )}
      </Button>
    </Card>
  );
}
