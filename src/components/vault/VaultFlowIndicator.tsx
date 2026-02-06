import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FlowStep = "prepare" | "commit" | "execute" | "record";
type StepState = "locked" | "active" | "completed";

interface VaultFlowIndicatorProps {
  vaultOpen: boolean;
  focusActive: boolean;
  tradesTaken: number;
  tradesVerified: number;
}

interface StepConfig {
  id: FlowStep;
  label: string;
}

const STEPS: StepConfig[] = [
  { id: "prepare", label: "Prepare" },
  { id: "commit", label: "Commit" },
  { id: "execute", label: "Execute" },
  { id: "record", label: "Record" },
];

function getStepStates(props: VaultFlowIndicatorProps): Record<FlowStep, StepState> {
  const { vaultOpen, focusActive, tradesTaken, tradesVerified } = props;

  // Prepare: Active if ritual not done, Completed if done
  const prepareState: StepState = vaultOpen ? "completed" : "active";

  // Commit: Active if ritual done AND focus not active, Completed if focus active
  const commitState: StepState = !vaultOpen
    ? "locked"
    : focusActive
    ? "completed"
    : "active";

  // Execute: Active if focus active, Completed if trades taken
  const executeState: StepState = !focusActive
    ? "locked"
    : tradesTaken > 0
    ? "completed"
    : "active";

  // Record: Active if trades taken but not all verified, Completed if all verified
  const recordState: StepState = tradesTaken === 0
    ? "locked"
    : tradesVerified >= tradesTaken
    ? "completed"
    : "active";

  return {
    prepare: prepareState,
    commit: commitState,
    execute: executeState,
    record: recordState,
  };
}

export function VaultFlowIndicator(props: VaultFlowIndicatorProps) {
  const states = getStepStates(props);

  return (
    <div className="flex flex-col gap-3 py-2">
      {STEPS.map((step, index) => {
        const state = states[step.id];
        const isLast = index === STEPS.length - 1;

        return (
          <div key={step.id} className="flex items-start gap-2.5">
            {/* Indicator dot/check */}
            <div className="flex flex-col items-center">
            <div
                className={cn(
                  "w-2 h-2 rounded-full flex items-center justify-center",
                  state === "completed" && "bg-accent",
                  state === "active" && "bg-foreground",
                  state === "locked" && "bg-muted-foreground/30"
                )}
              >
                {state === "completed" && (
                  <Check className="w-1.5 h-1.5 text-background" strokeWidth={3} />
                )}
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    "w-px h-5 mt-1",
                    state === "completed"
                      ? "bg-accent/40"
                      : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                "text-xs leading-none -mt-0.5",
                state === "completed" && "text-muted-foreground",
                state === "active" && "text-foreground font-medium",
                state === "locked" && "text-muted-foreground/50"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Export helper to determine which card should be emphasized
export function getActiveFlowStep(props: VaultFlowIndicatorProps): FlowStep | null {
  const states = getStepStates(props);
  
  for (const step of STEPS) {
    if (states[step.id] === "active") {
      return step.id;
    }
  }
  return null;
}
