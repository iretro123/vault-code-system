import React, { useState, useEffect } from "react";
import { X, PanelRightOpen } from "lucide-react";
import { SessionRemindersPanel } from "./SessionRemindersPanel";
import { ScalingRulesPanel } from "./ScalingRulesPanel";

const STORAGE_KEY = "vault-side-panel-dismissed";

interface CockpitSidePanelProps {
  microFeedback?: string | null;
}

export function CockpitSidePanel({ microFeedback }: CockpitSidePanelProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(dismissed));
    } catch {}
  }, [dismissed]);

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed right-4 top-20 z-30 p-2 rounded-md bg-card border border-border/50 text-muted-foreground hover:text-foreground transition-colors hidden lg:flex items-center gap-1.5"
        aria-label="Show side panel"
      >
        <PanelRightOpen className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col gap-3 w-72 shrink-0 sticky top-20 self-start">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Session Info
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Micro feedback — one line, data-driven */}
      {microFeedback && (
        <div className="px-3 py-2 rounded-lg bg-muted/10 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Vault Insight</p>
          <p className="text-xs text-foreground">{microFeedback}</p>
        </div>
      )}

      <SessionRemindersPanel />
      <ScalingRulesPanel />
    </aside>
  );
}
