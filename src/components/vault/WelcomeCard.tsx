import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";

const STORAGE_KEY = "vault-welcome-dismissed";

export function WelcomeCard() {
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    setDismissed(wasDismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <Card className="vault-card p-4 mb-4 border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Welcome to Vault OS
          </h3>
          <p className="text-xs text-muted-foreground">
            Complete your Daily Ritual to unlock trading. The Vault enforces your rules so you don't have to.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
