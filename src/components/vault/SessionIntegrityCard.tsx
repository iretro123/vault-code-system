import React from "react";
import { useVaultSessionIntegrity } from "@/hooks/useVaultSessionIntegrity";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SessionIntegrityCard() {
  const { loading, error, trades, verified, integrity } = useVaultSessionIntegrity();

  const integrityLabel =
    loading ? "Updating…" : error ? "—" : `${integrity.toFixed(1).replace(".0", "")}%`;

  const getIntegrityColor = () => {
    if (error) return "text-muted-foreground";
    if (integrity >= 100) return "text-emerald-400";
    if (integrity >= 80) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <Card className="vault-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Session Integrity
        </span>
        <span className={cn("text-lg font-mono font-bold", getIntegrityColor())}>
          {integrityLabel}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-rose-400">Integrity error: {error}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Trades Today</p>
            <p className="text-xl font-mono font-semibold text-foreground">
              {loading ? "…" : trades}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Verified</p>
            <p className={cn("text-xl font-mono font-semibold", getIntegrityColor())}>
              {loading ? "…" : `${verified}/${trades ?? 0}`}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-white/10">
        Verified trades are the only ones that count toward rank and level.
      </p>
    </Card>
  );
}
