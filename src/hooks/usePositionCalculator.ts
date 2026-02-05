 import { useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export interface PositionResult {
   allowed: boolean;
   reason: string;
   maxRiskAllowed: number;
   riskPercent: number;
   maxLossAmount: number;
   positionSize: number;
 }
 
 export interface PositionCalculatorState {
   result: PositionResult | null;
   loading: boolean;
   error: string | null;
   calculate: (accountSize: number, riskPercent: number, stopLossPercent: number) => Promise<void>;
 }
 
 const DEFAULT_RESULT: PositionResult = {
   allowed: false,
   reason: "",
   maxRiskAllowed: 0,
   riskPercent: 0,
   maxLossAmount: 0,
   positionSize: 0,
 };
 
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
             maxRiskAllowed: Number(row.max_risk_allowed),
             riskPercent: Number(row.risk_percent),
             maxLossAmount: Number(row.max_loss_amount),
             positionSize: Number(row.position_size),
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