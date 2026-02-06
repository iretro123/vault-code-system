import React, { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVaultFocusStatus } from "@/hooks/useVaultFocusStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function FocusSessionCard() {
  const { data, loading, error, refetch } = useVaultFocusStatus();
  const [mins, setMins] = useState(90);
  const [starting, setStarting] = useState(false);

  const remaining = useMemo(() => {
    if (!data.active) return null;
    return data.remaining_seconds;
  }, [data]);

  const start = async () => {
    setStarting(true);
    await supabase.rpc("start_vault_focus_session", {
      duration_minutes: mins,
      max_trades: 6,
      cooldown_after_loss_minutes: 10,
      goals: "Trade like a professional. One setup. Clean execution.",
    });
    setStarting(false);
    refetch();
  };

  return (
    <Card className="vault-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Focus Session
          </CardTitle>
          <span
            className={`text-xs font-semibold ${
              loading
                ? "text-muted-foreground"
                : data.active
                ? "text-emerald-400"
                : "text-muted-foreground"
            }`}
          >
            {loading ? "…" : data.active ? "ACTIVE" : "OFF"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4">
        {error && <p className="text-xs text-rose-400">{error}</p>}

        {data.active ? (
          <div className="space-y-2">
            <p className="text-lg font-semibold tabular-nums text-foreground">
              Time left:{" "}
              <span className="text-primary">
                {remaining != null ? fmtTime(remaining) : "…"}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Trades remaining:{" "}
              <span className="font-medium text-foreground">
                {data.trades_remaining}
              </span>
            </p>
            <p className="text-xs text-muted-foreground pt-2">
              Vault tightens discipline during this block. When it ends, trading stops.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose your focused trading block.
            </p>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={480}
                value={mins}
                onChange={(e) => setMins(Number(e.target.value))}
                className="vault-input w-20 h-9"
              />
              <span className="text-sm text-muted-foreground">minutes</span>

              <Button
                size="sm"
                onClick={start}
                disabled={starting}
                className="vault-cta ml-auto px-4"
              >
                {starting ? "Starting…" : "Start"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Not a schedule. A contract: trade clean for the time you choose.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
