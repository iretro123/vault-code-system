import { useVaultState } from "@/contexts/VaultStateContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
  eod: EodData | null,
  sessionPaused?: boolean
): string {
  if (sessionPaused) {
    return "SESSION PAUSED · TRADING LOCKED";
  }

  const {
    vault_status,
    risk_remaining_today,
    daily_loss_limit,
    trades_remaining_today,
    loss_streak,
    open_trade,
  } = vault;

  if (vault_status === "RED") {
    return "DAILY LOSS LIMIT REACHED · TRADING LOCKED";
  }

  if (daily_loss_limit > 0 && risk_remaining_today <= daily_loss_limit * 0.15 && risk_remaining_today > 0) {
    return `$${risk_remaining_today.toFixed(0)} RISK REMAINING · APPROACHING LIMIT`;
  }

  if (loss_streak >= 2 && vault_status === "YELLOW") {
    return `${loss_streak} CONSECUTIVE LOSSES · 1 MORE TRIGGERS RESTRICTION`;
  }

  if (trades_remaining_today === 1) {
    return "LAST TRADE OF THE DAY REMAINING";
  }

  if (trades_remaining_today <= 0) {
    return "MAX TRADES REACHED FOR TODAY";
  }

  if (open_trade) {
    return "TRADE LIVE · VAULT MONITORING POSITION";
  }

  if (eod && eod.trades_blocked > 0) {
    return `VAULT BLOCKED ${eod.trades_blocked} UNSAFE TRADE${eod.trades_blocked !== 1 ? "S" : ""} TODAY`;
  }

  if (loss_streak === 0 && eod && eod.trades_taken >= 2) {
    return `${eod.trades_taken} TRADES · ZERO LOSSES TODAY`;
  }

  return "VAULT ACTIVE · ACCOUNT PROTECTED";
}

interface VaultCommandBarProps {
  sessionPaused?: boolean;
}

export function VaultCommandBar({ sessionPaused }: VaultCommandBarProps) {
  const { user } = useAuth();
  const { state: vault, loading } = useVaultState();
  const eod = useEodData(user?.id);

  if (!user || loading) return null;

  const message = deriveMessage(vault, eod, sessionPaused);

  const greenGlow = "0 0 2px #4ade80, 0 0 6px rgba(74,222,128,0.4), 0 0 14px rgba(74,222,128,0.15)";
  const amberGlow = "0 0 2px #fbbf24, 0 0 6px rgba(251,191,36,0.4), 0 0 14px rgba(251,191,36,0.15)";

  return (
    <div className="w-full relative">
      {/* Status text */}
      <div className="w-full bg-background">
        <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-center">
          <p
            className={cn(
              "text-[13px] font-semibold tracking-tight uppercase text-center truncate",
              sessionPaused ? "text-amber-400" : "text-emerald-400"
            )}
          >
            {message}
          </p>
        </div>
      </div>
      {/* Light saber strip */}
      <div
        className="w-full"
        style={{
          height: "3px",
          background: sessionPaused
            ? "linear-gradient(90deg, transparent 5%, #fbbf24 30%, #fbbf24 70%, transparent 95%)"
            : "linear-gradient(90deg, transparent 5%, #4ade80 30%, #4ade80 70%, transparent 95%)",
          boxShadow: sessionPaused ? amberGlow : greenGlow,
        }}
      />
    </div>
  );
}
