import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Brain, Moon, Heart, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChecklistFormData {
  mentalState: number;
  sleepQuality: number;
  emotionalControl: number;
  planReviewed: boolean;
  riskConfirmed: boolean;
}

const STEP_LABELS = ["Poor", "Low", "Average", "Good", "Elite"] as const;

function RatingSlider({ 
  value, 
  onChange, 
  label, 
  icon: Icon 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  label: string;
  icon: React.ElementType;
}) {
  const getColor = (v: number) => {
    if (v <= 2) return "text-rose-400";
    if (v === 3) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold transition-colors duration-150",
          value <= 2 && "bg-rose-500/15",
          value === 3 && "bg-amber-500/15",
          value >= 4 && "bg-emerald-500/15",
          getColor(value)
        )}>
          <span className="font-mono">{value}</span>
          <span className="opacity-70">•</span>
          <span>{STEP_LABELS[value - 1]}</span>
        </div>
      </div>
      
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={1}
        max={5}
        step={1}
        showTicks
        tickCount={5}
        className="w-full"
      />
      
      <div className="flex justify-between px-0 mt-1">
        {STEP_LABELS.map((stepLabel, i) => (
          <span 
            key={stepLabel}
            className={cn(
              "text-[9px] uppercase tracking-wide transition-all duration-200 text-center w-10",
              value === i + 1 
                ? "text-foreground/80 font-medium" 
                : "text-muted-foreground/40"
            )}
          >
            {stepLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * DISABLED — This component renders UI but does NOT:
 * - gate trading
 * - unlock the vault
 * - change vault status
 * - call any RPCs
 */
export function DailyVaultGate() {
  const [formData, setFormData] = useState<ChecklistFormData>({
    mentalState: 3,
    sleepQuality: 3,
    emotionalControl: 3,
    planReviewed: false,
    riskConfirmed: false,
  });

  const handleSubmit = () => {
    toast.info("Daily ritual logged (informational only — does not affect trading).");
  };

  const progress = 0;

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Ritual Progress
          </span>
          <span className="text-sm font-bold text-foreground">
            0/5 Complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Checklist Form */}
      <div className="space-y-5">
        <RatingSlider
          value={formData.mentalState}
          onChange={(v) => setFormData((p) => ({ ...p, mentalState: v }))}
          label="Mental State"
          icon={Brain}
        />
        
        <RatingSlider
          value={formData.sleepQuality}
          onChange={(v) => setFormData((p) => ({ ...p, sleepQuality: v }))}
          label="Sleep Quality"
          icon={Moon}
        />
        
        <RatingSlider
          value={formData.emotionalControl}
          onChange={(v) => setFormData((p) => ({ ...p, emotionalControl: v }))}
          label="Emotional Control"
          icon={Heart}
        />

        <div className="space-y-3 pt-2 border-t border-white/10">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <Checkbox
              checked={formData.planReviewed}
              onCheckedChange={(checked) => 
                setFormData((p) => ({ ...p, planReviewed: checked === true }))
              }
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Trading Plan Reviewed</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                I have reviewed my trading plan and know my setups for today
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <Checkbox
              checked={formData.riskConfirmed}
              onCheckedChange={(checked) => 
                setFormData((p) => ({ ...p, riskConfirmed: checked === true }))
              }
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Max Risk Understood</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                I understand my maximum risk per trade and daily loss limits
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Submit Button — informational only */}
      <Button
        onClick={handleSubmit}
        disabled={!formData.planReviewed || !formData.riskConfirmed}
        className="vault-cta w-full h-12 text-base font-semibold gap-2"
      >
        <Brain className="w-5 h-5" />
        Log Daily Ritual
      </Button>

      {(formData.mentalState <= 2 || formData.sleepQuality <= 2 || formData.emotionalControl <= 2) && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400">
              Low readiness detected — consider trading conservatively today.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
