import { useVaultState } from "@/contexts/VaultStateContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";

interface EodData {
  trades_taken: number;
  trades_blocked: number;
}

function useEodData(userId: string | undefined): EodData | null {
  const [data, setData] = useState<EodData | null>(null);
  const fetched = useRef(false);

  const fetch = useCallback(async () => {
    if (!userId || fetched.current) return;
    fetched.current = true;
    try {
      const { data: rows } = await supabase.rpc("get_eod_review", { _user_id: userId });
      if (rows && rows.length > 0) {
        setData({ trades_taken: rows[0].trades_taken, trades_blocked: rows[0].trades_blocked });
      }
    } catch {}
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);
  return data;
}

function deriveMessage(
  vault: ReturnType<typeof useVaultState>["state"],
  eod: EodData | null
): string {
  const {
    vault_status,
    risk_remaining_today,
    daily_loss_limit,
    trades_remaining_today,
    loss_streak,
    open_trade,
  } = vault;

  // Priority 1: Critical warnings
  if (vault_status === "RED") {
    return "Daily loss limit reached. Trading is locked.";
  }

  if (daily_loss_limit > 0 && risk_remaining_today <= daily_loss_limit * 0.15 && risk_remaining_today > 0) {
    return `Only $${risk_remaining_today.toFixed(0)} risk remaining. Approaching daily limit.`;
  }

  if (loss_streak >= 2 && vault_status === "YELLOW") {
    return `${loss_streak} consecutive losses. 1 more triggers restriction.`;
  }

  if (trades_remaining_today === 1) {
    return "Last trade of the day remaining.";
  }

  if (trades_remaining_today <= 0) {
    return "Max trades reached for today.";
  }

  // Priority 2: Current state
  if (open_trade) {
    return "Trade is live. Vault monitoring position.";
  }

  // Priority 3: Data-derived insights
  if (eod && eod.trades_blocked > 0) {
    return `Vault blocked ${eod.trades_blocked} unsafe trade${eod.trades_blocked !== 1 ? "s" : ""} today.`;
  }

  if (loss_streak === 0 && eod && eod.trades_taken >= 2) {
    return `${eod.trades_taken} trades executed with zero losses today.`;
  }

  // Priority 4: Neutral
  return "Vault active. Account protected.";
}

export function VaultCommandBar() {
  const { user } = useAuth();
  const { state: vault, loading } = useVaultState();
  const eod = useEodData(user?.id);

  if (!user || loading) return null;

  const message = deriveMessage(vault, eod);

  return (
    <div className="w-full bg-background border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-center">
        <p className="text-xs font-medium tracking-wide text-muted-foreground text-center truncate">
          {message}
        </p>
      </div>
    </div>
  );
}
