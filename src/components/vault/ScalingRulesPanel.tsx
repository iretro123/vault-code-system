import React from "react";
import { Info } from "lucide-react";

export function ScalingRulesPanel() {
  return (
    <div className="vault-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">How You Earn More Size</h3>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
        <li>Avoid RED days.</li>
        <li>Keep losses small.</li>
        <li>Size increases automatically over time.</li>
        <li>No manual unlocks.</li>
      </ul>
    </div>
  );
}
