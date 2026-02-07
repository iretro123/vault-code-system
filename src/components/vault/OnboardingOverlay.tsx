import React, { useState, useEffect } from "react";
import { ShieldCheck, ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "vault-onboarding-completed";

const steps = [
  {
    number: 1,
    title: "Check your Vault Status",
    description: "Your status is GREEN, YELLOW, or RED. It controls what you can do.",
  },
  {
    number: 2,
    title: "Click BUYING NOW",
    description: "Request trade approval. The Vault enforces your limits automatically.",
  },
  {
    number: 3,
    title: "Close with SELL / CLOSE POSITION",
    description: "Log your result. The Vault updates your status immediately.",
  },
];

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") {
        setVisible(true);
      }
    } catch {}
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  };

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border/50 rounded-xl max-w-sm w-full p-6 space-y-5 relative">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Vault OS — Quick Start</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
              {current.number}
            </span>
            <h2 className="text-base font-semibold text-foreground">{current.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-11">{current.description}</p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-end">
          {isLast ? (
            <button
              onClick={dismiss}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Got it
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
