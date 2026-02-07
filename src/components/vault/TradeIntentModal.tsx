import React, { useState } from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Direction = "CALL" | "PUT";
type ModalState = "form" | "submitting" | "approved" | "rejected";

interface TradeIntentModalProps {
  open: boolean;
  onClose: () => void;
}

export function TradeIntentModal({ open, onClose }: TradeIntentModalProps) {
  const { user } = useAuth();
  const { state: vault, refetch } = useVaultState();

  const [direction, setDirection] = useState<Direction | null>(null);
  const [contracts, setContracts] = useState("");
  const [estimatedRisk, setEstimatedRisk] = useState("");
  const [modalState, setModalState] = useState<ModalState>("form");
  const [resultMessage, setResultMessage] = useState("");

  if (!open) return null;

  const contractsNum = parseInt(contracts, 10);
  const riskNum = parseFloat(estimatedRisk);

  // Client-side validation
  const clientErrors: string[] = [];
  if (direction === null) clientErrors.push("Select a direction.");
  if (!contracts || isNaN(contractsNum) || contractsNum < 1) clientErrors.push("Enter valid contracts (≥ 1).");
  if (!estimatedRisk || isNaN(riskNum) || riskNum <= 0) clientErrors.push("Enter valid estimated risk (> $0).");

  if (clientErrors.length === 0) {
    if (contractsNum > vault.max_contracts_allowed)
      clientErrors.push(`Vault limit: ${vault.max_contracts_allowed} contract${vault.max_contracts_allowed !== 1 ? "s" : ""}. Reduce size to proceed.`);
    if (riskNum > vault.risk_remaining_today)
      clientErrors.push(`Risk exceeds remaining $${vault.risk_remaining_today.toFixed(0)}.`);
  }

  const canSubmit = direction !== null && clientErrors.length === 0;

  const handleSubmit = async () => {
    if (!canSubmit || !user || !direction) return;

    setModalState("submitting");

    try {
      const { data, error } = await supabase.rpc("submit_trade_intent", {
        _user_id: user.id,
        _direction: direction,
        _contracts: contractsNum,
        _estimated_risk: riskNum,
      });

      if (error) {
        setResultMessage(error.message);
        setModalState("rejected");
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        setResultMessage(result.message);
        setModalState(result.success ? "approved" : "rejected");
        if (result.success) refetch();
      }
    } catch (err) {
      setResultMessage("Unexpected error. Try again.");
      setModalState("rejected");
    }
  };

  const handleClose = () => {
    setDirection(null);
    setContracts("");
    setEstimatedRisk("");
    setModalState("form");
    setResultMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="vault-card w-full max-w-md p-6 relative animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Trade Intent</h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form State */}
        {modalState === "form" && (
          <div className="space-y-5">
            {/* Direction */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Direction
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["CALL", "PUT"] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setDirection(dir)}
                    className={cn(
                      "px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide border transition-all duration-150",
                      direction === dir
                        ? dir === "CALL"
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                          : "bg-rose-500/10 border-rose-500/40 text-rose-500"
                        : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
                    )}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            {/* Contracts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contracts
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Max {vault.max_contracts_allowed}
                </span>
              </div>
              <Input
                type="number"
                min={1}
                max={vault.max_contracts_allowed}
                value={contracts}
                onChange={(e) => setContracts(e.target.value)}
                placeholder="1"
                className="font-mono text-lg h-12"
                autoFocus
              />
            </div>

            {/* Estimated Risk */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Estimated Risk ($)
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Remaining ${vault.risk_remaining_today.toFixed(0)}
                </span>
              </div>
              <Input
                type="number"
                min={1}
                step="0.01"
                value={estimatedRisk}
                onChange={(e) => setEstimatedRisk(e.target.value)}
                placeholder="0.00"
                className="font-mono text-lg h-12"
              />
            </div>

            {/* Client validation errors */}
            {direction !== null && (contracts || estimatedRisk) && clientErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1">
                {clientErrors.map((err, i) => (
                  <p key={i} className="text-xs text-rose-400">{err}</p>
                ))}
              </div>
            )}

            {/* Submit */}
            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="vault-cta w-full h-12 text-base font-semibold uppercase tracking-wide rounded-xl"
              size="lg"
            >
              Submit Intent
            </Button>
          </div>
        )}

        {/* Submitting State */}
        {modalState === "submitting" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validating with Vault…</p>
          </div>
        )}

        {/* Approved State */}
        {modalState === "approved" && (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="p-4 rounded-full bg-emerald-500/10">
              <ShieldCheck className="h-10 w-10 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground mb-1">
                {resultMessage}
              </p>
              <p className="text-xs text-muted-foreground">
                {direction} · {contracts} contract{contractsNum !== 1 ? "s" : ""} · ${riskNum.toFixed(2)} risk
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="w-full mt-2"
              variant="outline"
            >
              Close
            </Button>
          </div>
        )}

        {/* Rejected State */}
        {modalState === "rejected" && (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="p-4 rounded-full bg-rose-500/10">
              <ShieldOff className="h-10 w-10 text-rose-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground mb-1">
                Trade Blocked
              </p>
              <p className="text-sm text-muted-foreground">
                {resultMessage}
              </p>
            </div>
            <Button
              onClick={() => setModalState("form")}
              className="w-full mt-2"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
