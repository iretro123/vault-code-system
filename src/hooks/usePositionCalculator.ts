 import { useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
import { useVaultProtectionStatus } from "./useVaultProtectionStatus";
 import { useVaultConsistencyStatus } from "./useVaultConsistencyStatus";
 
 export interface PositionResult {
   allowed: boolean;
   reason: string;
   adaptiveRiskLimit: number;
   requestedRisk: number;
   positionSize: number;
   maxLossAmount: number;
  protectionRestricted: boolean;
  effectiveRiskLimit: number;
   consistencyRestricted: boolean;
   consistencyModifier: number;
 }
 
 export interface PositionCalculatorState {
   result: PositionResult | null;
   loading: boolean;
   error: string | null;
   calculate: (accountSize: number, riskPercent: number, stopLossPercent: number) => Promise<void>;
  protectionStatus: ReturnType<typeof useVaultProtectionStatus>;
   consistencyStatus: ReturnType<typeof useVaultConsistencyStatus>;
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
   consistencyRestricted: false,
   consistencyModifier: 1,
 };
 
 export function usePositionCalculator(): PositionCalculatorState {
   const { user } = useAuth();
  const protectionStatus = useVaultProtectionStatus();
   const consistencyStatus = useVaultConsistencyStatus();
   const [result, setResult] = useState<PositionResult | null>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
 
   const calculate = useCallback(
     async (accountSize: number, riskPercent: number, stopLossPercent: number) => {
       if (!user) {
         setError("Not authenticated");
         return;
       }
 
       // Check for intervention required first
       if (consistencyStatus.interventionRequired) {
         setResult({
           allowed: false,
           reason: "Trading blocked: Consistency intervention required",
           adaptiveRiskLimit: 0,
           requestedRisk: riskPercent,
           positionSize: 0,
           maxLossAmount: 0,
           protectionRestricted: false,
           effectiveRiskLimit: 0,
           consistencyRestricted: true,
           consistencyModifier: 0,
         });
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
           consistencyRestricted: false,
           consistencyModifier: consistencyStatus.recommendedRiskModifier,
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
           // Apply both protection and consistency modifiers
           const combinedModifier = protectionStatus.riskRestrictionFactor * consistencyStatus.recommendedRiskModifier;
           const effectiveLimit = baseLimit * combinedModifier;
          const protectionRestricted = protectionStatus.riskRestrictionFactor < 1;
           const consistencyRestricted = consistencyStatus.recommendedRiskModifier < 1;
          
           // Check if risk exceeds combined limit
           const riskExceedsLimit = riskPercent > effectiveLimit && (protectionRestricted || consistencyRestricted);
          
           if (riskExceedsLimit) {
             const reasons: string[] = [];
             if (protectionRestricted) reasons.push(`Protection: ${protectionStatus.protectionLevel}`);
             if (consistencyRestricted) reasons.push(`Consistency: ${consistencyStatus.consistencyLevel}`);
             
            setResult({
              allowed: false,
               reason: `Risk exceeds limit (${riskPercent.toFixed(2)}% > ${effectiveLimit.toFixed(2)}%) [${reasons.join(", ")}]`,
              adaptiveRiskLimit: baseLimit,
              requestedRisk: Number(row.requested_risk),
              positionSize: 0,
              maxLossAmount: 0,
               protectionRestricted,
              effectiveRiskLimit: effectiveLimit,
               consistencyRestricted,
               consistencyModifier: consistencyStatus.recommendedRiskModifier,
            });
          } else {
             const modifierNotes: string[] = [];
             if (protectionRestricted) modifierNotes.push(`Protection: ${protectionStatus.protectionLevel}`);
             if (consistencyRestricted) modifierNotes.push(`Consistency: ${consistencyStatus.consistencyLevel}`);
             const reasonSuffix = modifierNotes.length > 0 ? ` (${modifierNotes.join(", ")})` : "";
             
            setResult({
              allowed: row.allowed,
               reason: row.reason + reasonSuffix,
              adaptiveRiskLimit: baseLimit,
              requestedRisk: Number(row.requested_risk),
              positionSize: Number(row.position_size),
              maxLossAmount: Number(row.max_loss_amount),
              protectionRestricted,
              effectiveRiskLimit: effectiveLimit,
               consistencyRestricted,
               consistencyModifier: consistencyStatus.recommendedRiskModifier,
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
     [user, protectionStatus.protectionLevel, protectionStatus.riskRestrictionFactor, consistencyStatus.interventionRequired, consistencyStatus.recommendedRiskModifier, consistencyStatus.consistencyLevel]
   );
 
   return { result, loading, error, calculate, protectionStatus, consistencyStatus };
 }