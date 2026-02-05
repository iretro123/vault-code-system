 import { useState, useEffect } from "react";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { PageHeader } from "@/components/layout/PageHeader";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Button } from "@/components/ui/button";
 import { Card } from "@/components/ui/card";
 import { usePositionCalculator } from "@/hooks/usePositionCalculator";
 import { useVaultStatus } from "@/hooks/useVaultStatus";
 import { Calculator, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 export default function RiskCalculator() {
   const [accountSize, setAccountSize] = useState<string>("10000");
   const [riskPercent, setRiskPercent] = useState<string>("1");
   const [stopLossPercent, setStopLossPercent] = useState<string>("2");
   
   const { result, loading, error, calculate } = usePositionCalculator();
   const vaultStatus = useVaultStatus();
 
   // Auto-calculate on input change with debounce
   useEffect(() => {
     const account = parseFloat(accountSize);
     const risk = parseFloat(riskPercent);
     const stopLoss = parseFloat(stopLossPercent);
     
     if (account > 0 && risk > 0 && stopLoss > 0 && !vaultStatus.loading) {
       const timer = setTimeout(() => {
         calculate(account, risk, stopLoss);
       }, 300);
       return () => clearTimeout(timer);
     }
   }, [accountSize, riskPercent, stopLossPercent, calculate, vaultStatus.loading]);
 
   const formatCurrency = (value: number) => {
     return new Intl.NumberFormat("en-US", {
       style: "currency",
       currency: "USD",
       minimumFractionDigits: 2,
     }).format(value);
   };
 
   return (
     <AppLayout>
       <div className="container max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
         <PageHeader
           title="Risk Calculator"
           subtitle="Calculate position size within Vault rules"
         />
 
         {/* Vault Status Banner */}
         <Card className="p-4 mb-6 border-border/50">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Shield className="w-5 h-5 text-primary" />
               <div>
                 <p className="text-sm font-medium">Max Risk Per Trade</p>
                 <p className="text-xs text-muted-foreground">
                   Daily loss remaining: {vaultStatus.dailyLossRemaining.toFixed(1)}%
                 </p>
               </div>
             </div>
             <span className="text-2xl font-semibold text-primary">
               {vaultStatus.maxRiskPerTrade}%
             </span>
           </div>
         </Card>
 
         {/* Input Section */}
         <div className="space-y-4 mb-8">
           <div className="space-y-2">
             <Label htmlFor="accountSize" className="text-sm text-muted-foreground">
               Account Size (USD)
             </Label>
             <Input
               id="accountSize"
               type="number"
               value={accountSize}
               onChange={(e) => setAccountSize(e.target.value)}
               placeholder="10000"
               className="h-12 text-lg font-mono bg-card border-border"
             />
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="riskPercent" className="text-sm text-muted-foreground">
                 Risk (%)
               </Label>
               <Input
                 id="riskPercent"
                 type="number"
                 step="0.1"
                 value={riskPercent}
                 onChange={(e) => setRiskPercent(e.target.value)}
                 placeholder="1"
                 className="h-12 text-lg font-mono bg-card border-border"
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="stopLossPercent" className="text-sm text-muted-foreground">
                 Stop Loss (%)
               </Label>
               <Input
                 id="stopLossPercent"
                 type="number"
                 step="0.1"
                 value={stopLossPercent}
                 onChange={(e) => setStopLossPercent(e.target.value)}
                 placeholder="2"
                 className="h-12 text-lg font-mono bg-card border-border"
               />
             </div>
           </div>
         </div>
 
         {/* Results Section */}
         {loading && (
           <div className="text-center py-8">
             <Calculator className="w-8 h-8 animate-pulse mx-auto text-muted-foreground" />
             <p className="text-sm text-muted-foreground mt-2">Calculating...</p>
           </div>
         )}
 
         {error && (
           <Card className="p-4 border-destructive/50 bg-destructive/5">
             <div className="flex items-center gap-3">
               <AlertTriangle className="w-5 h-5 text-destructive" />
               <p className="text-sm text-destructive">{error}</p>
             </div>
           </Card>
         )}
 
         {result && !loading && (
           <div className="space-y-4">
             {/* Status Card */}
             <Card
               className={cn(
                 "p-4 border",
                 result.allowed
                   ? "border-primary/30 bg-primary/5"
                   : "border-destructive/30 bg-destructive/5"
               )}
             >
               <div className="flex items-center gap-3">
                 {result.allowed ? (
                   <CheckCircle2 className="w-5 h-5 text-primary" />
                 ) : (
                   <AlertTriangle className="w-5 h-5 text-destructive" />
                 )}
                 <div>
                   <p className={cn(
                     "text-sm font-medium",
                     result.allowed ? "text-primary" : "text-destructive"
                   )}>
                     {result.allowed ? "Within Risk Parameters" : "Risk Violation"}
                   </p>
                   <p className="text-xs text-muted-foreground">{result.reason}</p>
                 </div>
               </div>
             </Card>
 
             {/* Calculation Results */}
             {result.allowed && (
               <div className="grid grid-cols-2 gap-4">
                 <Card className="p-4 border-border/50">
                   <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                     Max Loss
                   </p>
                   <p className="text-2xl font-semibold font-mono">
                     {formatCurrency(result.maxLossAmount)}
                   </p>
                 </Card>
 
                 <Card className="p-4 border-primary/30 bg-primary/5">
                   <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                     Position Size
                   </p>
                   <p className="text-2xl font-semibold font-mono text-primary">
                     {formatCurrency(result.positionSize)}
                   </p>
                 </Card>
               </div>
             )}
 
             {/* Risk Limits */}
             <Card className="p-4 border-border/50">
               <div className="flex justify-between items-center">
                 <span className="text-sm text-muted-foreground">Adaptive Risk Limit</span>
                 <span className="text-sm font-mono">{result.adaptiveRiskLimit}%</span>
               </div>
               <div className="flex justify-between items-center mt-2">
                 <span className="text-sm text-muted-foreground">Requested Risk</span>
                 <span className={cn(
                   "text-sm font-mono",
                   result.requestedRisk > result.adaptiveRiskLimit ? "text-destructive" : "text-foreground"
                 )}>
                   {result.requestedRisk}%
                 </span>
               </div>
             </Card>
           </div>
         )}
       </div>
     </AppLayout>
   );
 }