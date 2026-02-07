import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVaultState } from "@/contexts/VaultStateContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalState = "form" | "submitting" | "done";

interface CloseTradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function CloseTradeModal({ open, onClose }: CloseTradeModalProps) {
  const { user } = useAuth();
  const { refetch } = useVaultState();
  const [resultInput, setResultInput] = useState("");
  const [isLoss, setIsLoss] = useState(false);
  const [modalState, setModalState] = useState<ModalState>("form");
  const [resultMessage, setResultMessage] = useState("");
  const [newStatus, setNewStatus] = useState<string | null>(null);

  if (!open) return null;

  const amount = parseFloat(resultInput);
  const isValid = !isNaN(amount) && amount > 0;
  const tradeResult = isValid ? (isLoss ? -amount : amount) : 0;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setModalState("submitting");

    try {
      const { data, error } = await supabase.rpc("close_trade_intent", {
        _user_id: user.id,
        _trade_result: tradeResult,
      });

      if (error) {
        setResultMessage(error.message);
        setModalState("done");
        return;
      }

      if (data && data.length > 0) {
        const row = data[0];
        setResultMessage(row.message);
        setNewStatus(row.new_vault_status);
        setModalState("done");
        if (row.success) refetch();
      }
    } catch {
      setResultMessage("Unexpected error.");
      setModalState("done");
    }
  };

  const handleClose = () => {
    setResultInput("");
    setIsLoss(false);
    setModalState("form");
    setResultMessage("");
    setNewStatus(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="vault-card w-full max-w-md p-6 relative animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Close Trade</h2>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {modalState === "form" && (
          <div className="space-y-5">
            {/* Win / Loss Toggle */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Result
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoss(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide border transition-all duration-150",
                    !isLoss
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                      : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
                  )}
                >
                  + Win
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoss(true)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide border transition-all duration-150",
                    isLoss
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-500"
                      : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
                  )}
                >
                  − Loss
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                Amount ($)
              </label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={resultInput}
                onChange={(e) => setResultInput(e.target.value)}
                placeholder="0.00"
                className="font-mono text-lg h-12"
                autoFocus
              />
              {isValid && (
                <p className={cn(
                  "text-sm font-mono mt-2",
                  isLoss ? "text-rose-400" : "text-emerald-400"
                )}>
                  {isLoss ? "−" : "+"}${amount.toFixed(2)}
                </p>
              )}
            </div>

            <Button
              disabled={!isValid}
              onClick={handleSubmit}
              className="vault-cta w-full h-12 text-base font-semibold uppercase tracking-wide rounded-xl"
              size="lg"
            >
              Confirm Close
            </Button>
          </div>
        )}

        {modalState === "submitting" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Updating Vault…</p>
          </div>
        )}

        {modalState === "done" && (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className={cn(
              "p-4 rounded-full",
              newStatus === "RED" ? "bg-rose-500/10" : newStatus === "YELLOW" ? "bg-amber-500/10" : "bg-emerald-500/10"
            )}>
              {newStatus === "RED" || newStatus === "YELLOW" ? (
                <AlertTriangle className={cn(
                  "h-10 w-10",
                  newStatus === "RED" ? "text-rose-500" : "text-amber-500"
                )} />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              )}
            </div>
            <p className="text-base font-semibold text-foreground">
              {resultMessage}
            </p>
            <Button onClick={handleClose} className="w-full mt-2" variant="outline">
              Close
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
