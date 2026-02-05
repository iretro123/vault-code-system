 import { useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
import { useVaultProtectionStatus } from "./useVaultProtectionStatus";
 
 export interface PositionResult {
   allowed: boolean;
   reason: string;
   adaptiveRiskLimit: number;
   requestedRisk: number;
   positionSize: number;
   maxLossAmount: number;
  protectionRestricted: boolean;
  effectiveRiskLimit: number;
 }
 
 export interface PositionCalculatorState {
   result: PositionResult | null;
   loading: boolean;
   error: string | null;
   calculate: (accountSize: number, riskPercent: number, stopLossPercent: number) => Promise<void>;
  protectionStatus: ReturnType<typeof useVaultProtectionStatus>;
 }
 
 const DEFAULT_RESULT: PositionResult = {
   allowed: false,
   reason: "",
   adaptiveRiskLimit: 0,
   requestedRisk: 0,
   positionSize: 0,
   maxLossAmount: 0,
  protectionRestricted: false,
  effectiveRiskLimit: 0,
 };
 
 export function usePositionCalculator(): PositionCalculatorState {
   const { user } = useAuth();
  const protectionStatus = useVaultProtectionStatus();
   const [result, setResult] = useState<PositionResult | null>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
 
   const calculate = useCallback(
     async (accountSize: number, riskPercent: number, stopLossPercent: number) => {
       if (!user) {
         setError("Not authenticated");
         return;
       }
 
      // Check for lockdown first
      if (protectionStatus.protectionLevel === "LOCKDOWN") {
        setResult({
          allowed: false,
          reason: "Trading blocked: Protection Mode LOCKDOWN active",
          adaptiveRiskLimit: 0,
          requestedRisk: riskPercent,
          positionSize: 0,
          maxLossAmount: 0,
          protectionRestricted: true,
          effectiveRiskLimit: 0,
        });
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
          const baseLimit = Number(row.adaptive_risk_limit);
          const effectiveLimit = baseLimit * protectionStatus.riskRestrictionFactor;
          const protectionRestricted = protectionStatus.riskRestrictionFactor < 1;
          
          // Check if risk exceeds protection-adjusted limit
          const riskExceedsProtection = riskPercent > effectiveLimit && protectionRestricted;
          
          if (riskExceedsProtection) {
            setResult({
              allowed: false,
              reason: `Risk exceeds protection limit (${riskPercent.toFixed(2)}% > ${effectiveLimit.toFixed(2)}% at ${protectionStatus.protectionLevel} level)`,
              adaptiveRiskLimit: baseLimit,
              requestedRisk: Number(row.requested_risk),
              positionSize: 0,
              maxLossAmount: 0,
              protectionRestricted: true,
              effectiveRiskLimit: effectiveLimit,
            });
          } else {
            setResult({
              allowed: row.allowed,
              reason: protectionRestricted 
                ? `${row.reason} (Protection: ${protectionStatus.protectionLevel})`
                : row.reason,
              adaptiveRiskLimit: baseLimit,
              requestedRisk: Number(row.requested_risk),
              positionSize: Number(row.position_size),
              maxLossAmount: Number(row.max_loss_amount),
              protectionRestricted,
              effectiveRiskLimit: effectiveLimit,
            });
          }
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
    [user, protectionStatus.protectionLevel, protectionStatus.riskRestrictionFactor]
   );
 
  return { result, loading, error, calculate, protectionStatus };
 }