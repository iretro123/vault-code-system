import React, { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "vault-onboarding-completed";

const STEPS = [
  {
    target: "[data-tour='vault-status']",
    text: "This shows whether you are allowed to trade right now.",
  },
  {
    target: "[data-tour='buying-now']",
    text: "Click here before placing any trade to request approval.",
  },
  {
    target: "[data-tour='sell-close']",
    text: "Use this to close trades and log results.",
  },
];

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") {
        // Small delay to let DOM render
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const measure = useCallback(() => {
    if (!visible) return;
    const r = getRect(STEPS[step].target);
    setRect(r);
  }, [visible, step]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [visible, measure]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  }, []);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, dismiss]);

  if (!visible) return null;

  const pad = 8;
  const cutout = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Position tooltip below the cutout, centered horizontally
  const tooltipStyle: React.CSSProperties = cutout
    ? {
        position: "fixed",
        top: cutout.top + cutout.height + 12,
        left: Math.max(16, Math.min(cutout.left + cutout.width / 2 - 150, window.innerWidth - 316)),
        width: 300,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 300,
      };

  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100]" onClick={dismiss}>
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {cutout && (
              <rect
                x={cutout.left}
                y={cutout.top}
                width={cutout.width}
                height={cutout.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: "auto" }}
        />
      </svg>

      {/* Highlight ring */}
      {cutout && (
        <div
          className="absolute rounded-xl border-2 border-primary/60 pointer-events-none"
          style={{
            top: cutout.top,
            left: cutout.left,
            width: cutout.width,
            height: cutout.height,
            boxShadow: "0 0 0 4px hsl(var(--primary) / 0.15)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className="bg-card border border-border/50 rounded-xl p-4 space-y-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-foreground leading-snug">{STEPS[step].text}</p>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
            aria-label="Skip"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            {isLast ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
