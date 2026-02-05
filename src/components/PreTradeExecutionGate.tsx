 import { useState, useEffect } from "react";
 import { useVaultStatus } from "@/hooks/useVaultStatus";
import { useVaultProtectionStatus } from "@/hooks/useVaultProtectionStatus";
 import { useVaultConsistencyStatus } from "@/hooks/useVaultConsistencyStatus";
 import { Card } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import { 
   Shield, 
   Lock, 
   AlertTriangle, 
   CheckCircle2, 
   Target,
   Brain,
   Percent,
  Crosshair,
  Timer,
   ShieldAlert,
   Activity
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface PreTradeExecutionGateProps {
   onCleared: (emotionalState: number) => void;
   onCancel: () => void;
   plannedRisk: number;
 }
 
 interface ChecklistItem {
   id: string;
   label: string;
   description: string;
   icon: React.ReactNode;
   checked: boolean;
 }
 
 export function PreTradeExecutionGate({ 
   onCleared, 
   onCancel,
   plannedRisk 
 }: PreTradeExecutionGateProps) {
   const vaultStatus = useVaultStatus();
  const protection = useVaultProtectionStatus();
   const consistency = useVaultConsistencyStatus();
   const [emotionalState, setEmotionalState] = useState<number>(3);
   const [checklist, setChecklist] = useState<ChecklistItem[]>([
     {
       id: "setup_valid",
       label: "Setup is valid",
       description: "I confirm my trade setup meets my strategy criteria",
       icon: <Target className="w-4 h-4" />,
       checked: false,
     },
     {
       id: "risk_confirmed",
       label: "Risk within limits",
       description: "My planned risk matches the adaptive risk allowance",
       icon: <Percent className="w-4 h-4" />,
       checked: false,
     },
     {
       id: "stop_loss_set",
       label: "Stop loss is set",
       description: "I have defined my stop loss before entry",
       icon: <Crosshair className="w-4 h-4" />,
       checked: false,
     },
   ]);
 
   // Apply both protection and consistency mode risk restrictions
   const combinedModifier = protection.riskRestrictionFactor * consistency.recommendedRiskModifier;
   const effectiveMaxRisk = vaultStatus.maxRiskPerTrade * combinedModifier;
  const riskWithinLimit = plannedRisk <= effectiveMaxRisk;
  const isLockdown = protection.protectionLevel === "LOCKDOWN";
  const hasCooldown = protection.tradeCooldownMinutes > 0;
   const isInterventionRequired = consistency.interventionRequired;
  
  // Determine vault state
  const getVaultState = () => {
    if (!vaultStatus.canTrade) return "LOCKED";
    if (isLockdown) return "LOCKED";
     if (isInterventionRequired) return "LOCKED";
    if (vaultStatus.dailyLossRemaining < 1 || vaultStatus.tradesRemaining <= 1) return "CAUTION";
    if (protection.protectionLevel === "RESTRICTED" || protection.protectionLevel === "CAUTION") return "CAUTION";
     if (consistency.consistencyLevel === "UNSTABLE" || consistency.consistencyLevel === "CRITICAL") return "CAUTION";
    return "READY";
  };
  
  const vaultState = getVaultState();
  
  // Check if all items are validated
  const allChecked = checklist.every((item) => item.checked);
  const emotionalStateValid = emotionalState >= 1 && emotionalState <= 5;
   const canProceed = allChecked && emotionalStateValid && riskWithinLimit && vaultState !== "LOCKED" && !hasCooldown && !isInterventionRequired;
 
   const toggleChecklistItem = (id: string) => {
     setChecklist((prev) =>
       prev.map((item) =>
         item.id === id ? { ...item, checked: !item.checked } : item
       )
     );
   };
 
   const handleProceed = () => {
     if (canProceed) {
       onCleared(emotionalState);
     }
   };
 
   // Loading state
   if (vaultStatus.loading || protection.loading || consistency.loading) {
     return (
       <Card className="p-6 border-border/50">
         <div className="flex items-center justify-center gap-3">
           <Shield className="w-5 h-5 animate-pulse text-muted-foreground" />
           <span className="text-muted-foreground">Checking vault status...</span>
         </div>
       </Card>
     );
   }
 
   // Consistency intervention state - block completely
   if (isInterventionRequired) {
     return (
       <Card className="p-6 border-destructive/30 bg-destructive/5">
         <div className="text-center space-y-4">
           <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
             <Activity className="w-6 h-6 text-destructive" />
           </div>
           <div>
             <h3 className="text-lg font-semibold text-destructive">Consistency Intervention Required</h3>
             <p className="text-sm text-muted-foreground mt-1">
               Your consistency has deteriorated to critical levels ({consistency.consistencyScore}/100)
             </p>
           </div>
           <div className="pt-2 space-y-2 text-sm text-muted-foreground">
             <p>Trend: {consistency.trendDirection}</p>
             <p>Discipline Velocity: {consistency.disciplineVelocity.toFixed(2)}/day</p>
             <p>Emotional Stability: {consistency.emotionalStability.toFixed(0)}%</p>
           </div>
           <p className="text-xs text-muted-foreground">
             Focus on rebuilding consistent habits before resuming trading.
           </p>
           <Button variant="outline" onClick={onCancel} className="mt-4">
             Go Back
           </Button>
         </div>
       </Card>
     );
   }
 
  // Lockdown state from protection mode - block completely with specific message
  if (isLockdown) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-destructive">Protection Mode: LOCKDOWN</h3>
            <p className="text-sm text-muted-foreground mt-1">{protection.protectionReason}</p>
          </div>
          <div className="pt-2 space-y-2 text-sm text-muted-foreground">
            <p>Risk Restriction: {Math.round(protection.riskRestrictionFactor * 100)}%</p>
            {protection.tradeCooldownMinutes > 0 && (
              <p className="flex items-center justify-center gap-2">
                <Timer className="w-4 h-4" />
                Cooldown: {Math.floor(protection.tradeCooldownMinutes / 60)}h {protection.tradeCooldownMinutes % 60}m
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Stop trading immediately. Take time to reset your mental state.
          </p>
          <Button variant="outline" onClick={onCancel} className="mt-4">
            Go Back
          </Button>
        </div>
      </Card>
    );
  }

  // Vault closed (ritual not completed) — neutral guidance, not error
  if (!vaultStatus.canTrade && vaultStatus.reason?.toLowerCase().includes("vault is closed")) {
    const scrollToRitual = () => {
      const ritualCard = document.querySelector('[data-ritual-gate]');
      if (ritualCard) {
        ritualCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ritualCard.classList.add('ring-2', 'ring-primary');
        setTimeout(() => ritualCard.classList.remove('ring-2', 'ring-primary'), 2000);
      }
      onCancel();
    };

    return (
      <Card className="p-6 border-white/10 bg-white/5">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Vault closed — complete Daily Ritual to unlock</h3>
          </div>
          <Button onClick={scrollToRitual} className="mt-4">
            Start Ritual
          </Button>
        </div>
      </Card>
    );
  }

  // Standard locked state from vault status — neutral, not error
  if (vaultState === "LOCKED") {
     return (
       <Card className="p-6 border-white/10 bg-white/5">
         <div className="text-center space-y-4">
           <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
             <Lock className="w-6 h-6 text-muted-foreground" />
           </div>
           <div>
             <h3 className="text-lg font-semibold text-foreground">Trading Locked</h3>
             <p className="text-sm text-muted-foreground mt-1">Vault is protecting discipline.</p>
           </div>
           <div className="pt-2 space-y-2 text-sm text-muted-foreground">
             <p>{vaultStatus.reason}</p>
             <p>Discipline Score: {vaultStatus.disciplineScore}</p>
           </div>
           <Button variant="outline" onClick={onCancel} className="mt-4">
             Go Back
           </Button>
         </div>
       </Card>
     );
   }
 
   return (
     <Card className="p-6 border-border/50">
       {/* Header */}
       <div className="flex items-center gap-3 mb-6">
         <div className={cn(
           "w-10 h-10 rounded-full flex items-center justify-center",
           vaultState === "CAUTION" 
             ? "bg-status-warning/10" 
             : "bg-primary/10"
         )}>
           {vaultState === "CAUTION" ? (
             <AlertTriangle className="w-5 h-5 text-status-warning" />
           ) : (
             <Shield className="w-5 h-5 text-primary" />
           )}
         </div>
         <div>
           <h3 className="font-semibold">Pre-Trade Execution Gate</h3>
           <p className="text-sm text-muted-foreground">
             {vaultState === "CAUTION" 
               ? "Proceed with caution - limits nearly reached"
               : "Complete checklist before trade execution"
             }
           </p>
         </div>
       </div>
 
    {/* Protection Mode Warning */}
    {protection.protectionActive && protection.protectionLevel !== "LOCKDOWN" && (
      <div className={cn(
        "mb-4 p-3 rounded-lg border",
        protection.protectionLevel === "RESTRICTED" 
          ? "border-orange-500/30 bg-orange-500/5" 
          : "border-amber-500/30 bg-amber-500/5"
      )}>
        <div className="flex items-center gap-2">
          <ShieldAlert className={cn(
            "w-4 h-4",
            protection.protectionLevel === "RESTRICTED" ? "text-orange-500" : "text-amber-500"
          )} />
          <span className={cn(
            "text-sm font-medium",
            protection.protectionLevel === "RESTRICTED" ? "text-orange-500" : "text-amber-500"
          )}>
            Protection Mode: {protection.protectionLevel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Risk limited to {Math.round(protection.riskRestrictionFactor * 100)}% of normal ({effectiveMaxRisk.toFixed(2)}%)
        </p>
      </div>
    )}

     {/* Consistency Warning */}
     {consistency.recommendedRiskModifier < 1 && !consistency.interventionRequired && (
       <div className={cn(
         "mb-4 p-3 rounded-lg border",
         consistency.consistencyLevel === "CRITICAL" || consistency.consistencyLevel === "UNSTABLE"
           ? "border-orange-500/30 bg-orange-500/5" 
           : "border-amber-500/30 bg-amber-500/5"
       )}>
         <div className="flex items-center gap-2">
           <Activity className={cn(
             "w-4 h-4",
             consistency.consistencyLevel === "CRITICAL" || consistency.consistencyLevel === "UNSTABLE" 
               ? "text-orange-500" 
               : "text-amber-500"
           )} />
           <span className={cn(
             "text-sm font-medium",
             consistency.consistencyLevel === "CRITICAL" || consistency.consistencyLevel === "UNSTABLE" 
               ? "text-orange-500" 
               : "text-amber-500"
           )}>
             Consistency: {consistency.consistencyLevel} ({consistency.consistencyScore}/100)
           </span>
         </div>
         <p className="text-xs text-muted-foreground mt-1">
           Risk limited to {Math.round(consistency.recommendedRiskModifier * 100)}% due to consistency trend
         </p>
       </div>
     )}
 
    {/* Cooldown Warning */}
    {hasCooldown && (
      <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-2 text-destructive">
          <Timer className="w-4 h-4" />
          <span className="text-sm font-medium">
            Trade cooldown active: {protection.tradeCooldownMinutes} minutes remaining
          </span>
        </div>
      </div>
    )}

       {/* Vault Status Summary */}
       <div className="grid grid-cols-3 gap-3 mb-6 p-3 rounded-lg bg-muted/30">
         <div className="text-center">
           <p className="text-xs text-muted-foreground">Trades Left</p>
           <p className="text-lg font-semibold">{vaultStatus.tradesRemaining}</p>
         </div>
         <div className="text-center">
           <p className="text-xs text-muted-foreground">Loss Budget</p>
           <p className="text-lg font-semibold">{vaultStatus.dailyLossRemaining.toFixed(1)}%</p>
         </div>
         <div className="text-center">
        <p className="text-xs text-muted-foreground">Effective Max Risk</p>
        <p className={cn(
          "text-lg font-semibold",
           combinedModifier < 1 && "text-amber-500"
        )}>
          {effectiveMaxRisk.toFixed(2)}%
        </p>
         </div>
       </div>
 
       {/* Risk Check */}
       {!riskWithinLimit && (
         <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
           <div className="flex items-center gap-2 text-destructive">
             <AlertTriangle className="w-4 h-4" />
             <span className="text-sm font-medium">
            Planned risk ({plannedRisk}%) exceeds effective limit ({effectiveMaxRisk.toFixed(2)}%)
             </span>
           </div>
         </div>
       )}
 
       {/* Checklist */}
       <div className="space-y-3 mb-6">
         {checklist.map((item) => (
           <div
             key={item.id}
             className={cn(
               "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
               item.checked
                 ? "border-primary/30 bg-primary/5"
                 : "border-border/50 hover:border-border"
             )}
             onClick={() => toggleChecklistItem(item.id)}
           >
             <Checkbox
               id={item.id}
               checked={item.checked}
               onCheckedChange={() => toggleChecklistItem(item.id)}
               className="mt-0.5"
             />
             <div className="flex-1">
               <div className="flex items-center gap-2">
                 {item.icon}
                 <Label htmlFor={item.id} className="font-medium cursor-pointer">
                   {item.label}
                 </Label>
               </div>
               <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
             </div>
             {item.checked && (
               <CheckCircle2 className="w-4 h-4 text-primary" />
             )}
           </div>
         ))}
       </div>
 
       {/* Emotional State */}
       <div className="mb-6 p-4 rounded-lg border border-border/50">
         <div className="flex items-center gap-2 mb-3">
           <Brain className="w-4 h-4 text-muted-foreground" />
           <Label className="font-medium">Emotional State (1-5)</Label>
         </div>
         <p className="text-xs text-muted-foreground mb-3">
           1 = Stressed/Anxious, 3 = Neutral, 5 = Calm/Focused
         </p>
         <div className="flex items-center gap-4">
           <Input
             type="number"
             min={1}
             max={5}
             value={emotionalState}
             onChange={(e) => setEmotionalState(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
             className="w-20 text-center font-mono text-lg"
           />
           <div className="flex-1 flex justify-between text-xs text-muted-foreground">
             <span>Stressed</span>
             <span>Neutral</span>
             <span>Focused</span>
           </div>
         </div>
       </div>
 
       {/* Actions */}
       <div className="flex gap-3">
         <Button variant="outline" onClick={onCancel} className="flex-1">
           Cancel
         </Button>
         <Button 
           onClick={handleProceed} 
           disabled={!canProceed}
           className="flex-1"
         >
        {hasCooldown ? "Cooldown Active" : canProceed ? "Execute Trade" : "Complete Checklist"}
         </Button>
       </div>
     </Card>
   );
 }