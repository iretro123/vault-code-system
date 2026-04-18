import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X } from "lucide-react";

interface XPTooltipProps {
  text: string;
  white?: boolean;
  title?: string;
}

function usePosition(triggerRef: React.RefObject<HTMLElement | null>, open: boolean, width: number) {
  const [pos, setPos] = useState<{ top: number; left: number; placement: "above" | "below" }>({ top: 0, left: 0, placement: "above" });

  const calc = useCallback(() => {
    const el = triggerRef.current;
    if (!el || !open) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceAbove > 200 ? "above" : "below";
    const top = placement === "above" ? rect.top - pad : rect.bottom + pad;
    let left = rect.left + rect.width / 2 - width / 2;
    // clamp horizontal
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    setPos({ top, left, placement });
  }, [triggerRef, open, width]);

  useEffect(() => {
    if (!open) return;
    calc();
    window.addEventListener("scroll", calc, true);
    window.addEventListener("resize", calc);
    return () => { window.removeEventListener("scroll", calc, true); window.removeEventListener("resize", calc); };
  }, [open, calc]);

  return pos;
}

export function XPTooltip({ text, white, title }: XPTooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipWidth = white ? 340 : 220;
  const pos = usePosition(triggerRef, open, tooltipWidth);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (tooltipRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const transformOrigin = pos.placement === "above" ? "bottom center" : "top center";
  const translate = pos.placement === "above" ? "translateY(-100%)" : "translateY(0)";

  if (white) {
    return (
      <span className="inline-flex ml-1">
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-primary/60 hover:text-primary focus:outline-none"
          aria-label="Help"
          onClick={() => setOpen(!open)}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        {open && createPortal(
          <div
            ref={tooltipRef}
            className="fixed rounded-lg"
            style={{
              zIndex: 99999,
              top: pos.top,
              left: pos.left,
              width: tooltipWidth,
              maxHeight: "min(400px, 70vh)",
              overflowY: "auto",
              transform: translate,
              transformOrigin,
              background: "#ffffff",
              border: "1px solid hsl(217 91% 60% / 0.3)",
              boxShadow: "0 8px 32px hsl(0 0% 0% / 0.25), 0 2px 8px hsl(0 0% 0% / 0.12)",
            }}
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              {title && <p className="text-xs font-bold text-gray-900">{title}</p>}
              <button
                onClick={() => setOpen(false)}
                className="ml-auto w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
            <div className="px-3 pb-3 text-[11px] text-gray-700 leading-relaxed whitespace-pre-line">
              {text}
            </div>
          </div>,
          document.body
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex ml-1">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-muted-foreground/60 hover:text-primary/80 focus:outline-none"
        aria-label="Help"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(!open)}
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && createPortal(
        <div
          ref={tooltipRef}
          className="fixed rounded px-2.5 py-1.5 text-xs"
          style={{
            zIndex: 99999,
            top: pos.top,
            left: pos.left,
            width: tooltipWidth,
            transform: translate,
            transformOrigin,
            background: "hsl(214 22% 18%)",
            border: "1px solid hsl(213 18% 28%)",
            color: "hsl(210 20% 80%)",
            boxShadow: "0 4px 12px hsl(0 0% 0% / 0.3)",
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  );
}
