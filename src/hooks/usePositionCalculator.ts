import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PositionResult {
  allowed: boolean;
  reason: string;
  adaptiveRiskLimit: number;
  requestedRisk: number;
  positionSize: number;
  maxLossAmount: number;
}

export interface PositionCalculatorState {
  result: PositionResult | null;
  loading: boolean;
  error: string | null;
  calculate: (accountSize: number, riskPercent: number, stopLossPercent: number) => Promise<void>;
}

export function usePositionCalculator(): PositionCalculatorState {
  const { user } = useAuth();
  const [result, setResult] = useState<PositionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(
    async (accountSize: number, riskPercent: number, stopLossPercent: number) => {
      if (!user) {
        setError("Not authenticated");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc("calculate_position_size", {
          _user_id: user.id,
          _account_size: accountSize,
          _risk_percent: riskPercent,
          _stop_loss_percent: stopLossPercent,
        });

        if (rpcError) {
          console.error("Position calculation error:", rpcError);
          setError(rpcError.message);
          setResult(null);
          return;
        }

        if (data && data.length > 0) {
          const row = data[0];
          setResult({
            allowed: row.allowed,
            reason: row.reason,
            adaptiveRiskLimit: Number(row.adaptive_risk_limit),
            requestedRisk: Number(row.requested_risk),
            positionSize: Number(row.position_size),
            maxLossAmount: Number(row.max_loss_amount),
          });
        } else {
          setError("No calculation result returned");
          setResult(null);
        }
      } catch (err) {
        console.error("Position calculation failed:", err);
        setError("Calculation failed");
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { result, loading, error, calculate };
}
