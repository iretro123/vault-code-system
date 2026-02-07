import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * DISABLED — This component renders UI but does NOT:
 * - start focus sessions via RPC
 * - gate trading
 * - change vault status
 */

interface FocusSessionCardProps {
  variant?: "card" | "embedded";
}

export function FocusSessionCard({ variant = "card" }: FocusSessionCardProps) {
  const [mins, setMins] = useState(90);

  const handleStart = () => {
    toast.info("Focus sessions are informational only — they do not affect trading permissions.");
  };

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">OFF</span>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Choose your focused trading block.
        </p>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={5}
            max={480}
            value={mins}
            onChange={(e) => setMins(Number(e.target.value))}
            className="vault-input w-20 h-9"
          />
          <span className="text-sm text-muted-foreground">minutes</span>

          <Button
            size="sm"
            onClick={handleStart}
            className="vault-cta ml-auto px-4"
          >
            Start
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Not a schedule. A contract: trade clean for the time you choose.
        </p>
      </div>
    </div>
  );

  if (variant === "embedded") {
    return content;
  }

  return (
    <Card className="vault-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Focus Session
          </CardTitle>
          <span className="text-xs font-semibold text-muted-foreground">OFF</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {content}
      </CardContent>
    </Card>
  );
}
