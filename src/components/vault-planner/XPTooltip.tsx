import { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";

interface XPTooltipProps {
  text: string;
  /** Use white high-contrast tooltip style */
  white?: boolean;
  /** Rich content with title + body */
  title?: string;
}

export function XPTooltip({ text, white, title }: XPTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (white) {
    return (
      <span className="relative inline-flex ml-1" ref={ref}>
        <button
          type="button"
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-primary/60 hover:text-primary focus:outline-none"
          aria-label="Help"
          onClick={() => setOpen(!open)}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        {open && (
          <div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-[300px] sm:w-[340px] rounded-lg shadow-xl"
            style={{
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
          </div>
        )}
      </span>
    );
  }

  // Default dark tooltip (unchanged behavior)
  return (
    <span className="relative inline-flex ml-1" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-muted-foreground/60 hover:text-primary/80 focus:outline-none"
        aria-label="Help"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(!open)}
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-[220px] rounded px-2.5 py-1.5 text-xs"
          style={{
            background: "hsl(214 22% 18%)",
            border: "1px solid hsl(213 18% 28%)",
            color: "hsl(210 20% 80%)",
            boxShadow: "0 4px 12px hsl(0 0% 0% / 0.3)",
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
